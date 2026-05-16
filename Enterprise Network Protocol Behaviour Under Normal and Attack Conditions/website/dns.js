const packetOutput = document.getElementById("packetOutput");
const packetLayer = document.getElementById("packetLayer");
const topologyShell = document.getElementById("topologyShell");

const predefinedNormalBtn = document.getElementById("predefinedNormalBtn");
const predefinedAttackBtn = document.getElementById("predefinedAttackBtn");
const manualNormalBtn = document.getElementById("manualNormalBtn");
const manualAttackBtn = document.getElementById("manualAttackBtn");
const validatePairBtn = document.getElementById("validatePairBtn");
const resetSimulationBtn = document.getElementById("resetSimulationBtn");
const sourceIpInput = document.getElementById("sourceIp");
const destinationIpInput = document.getElementById("destinationIp");
const validationStatus = document.getElementById("validationStatus");

let isRunning = false;
let activePackets = [];
let currentRunId = 0;
let pendingTimers = new Set();

const SPEED = {
  lineDuration: 7600,
  lineGap: 1800,
  stepPause: 4200,
  startPause: 6500
};

const NODE_MAP = {
  "192.168.10.101": { name: "HQ-PC1", branch: "HQ", switch: "hq1", type: "pc", access: "hq1-pc1" },
  "192.168.10.102": { name: "HQ-PC2", branch: "HQ", switch: "hq1", type: "pc", access: "hq1-pc2" },
  "192.168.10.103": { name: "HQ-PC3", branch: "HQ", switch: "hq2", type: "pc", access: "hq2-pc3" },
  "192.168.10.104": { name: "HQ-PC4", branch: "HQ", switch: "hq2", type: "pc", access: "hq2-pc4" },

  "192.168.20.101": { name: "BR-PC1", branch: "BR", switch: "br1", type: "pc", access: "br1-pc1" },
  "192.168.20.102": { name: "BR-PC2", branch: "BR", switch: "br1", type: "pc", access: "br1-pc2" },
  "192.168.20.103": { name: "BR-PC3", branch: "BR", switch: "br2", type: "pc", access: "br2-pc3" },
  "192.168.20.104": { name: "BR-PC4", branch: "BR", switch: "br2", type: "pc", access: "br2-pc4" },

  "192.168.10.53": { name: "DNS-CENTRAL", branch: "HQ", type: "dns" },
  "192.168.20.53": { name: "DNS-BR", branch: "BR", type: "dns" }
};

const SWITCH_META = {
  hq1: {
    bus: "hq1-bus",
    up: "hq1-up",
    attacker: "hq1-att1",
    routerLink: "r1-sw1",
    dnsLink: "r1-dnshq",
    rogue: "HQ-ATT-1"
  },
  hq2: {
    bus: "hq2-bus",
    up: "hq2-up",
    attacker: "hq2-att2",
    routerLink: "r1-sw2",
    dnsLink: "r1-dnshq",
    rogue: "HQ-ATT-2"
  },
  br1: {
    bus: "br1-bus",
    up: "br1-up",
    attacker: "br1-att1",
    routerLink: "r4-sw1",
    dnsLink: "r4-dnsbr",
    rogue: "BR-ATT-1"
  },
  br2: {
    bus: "br2-bus",
    up: "br2-up",
    attacker: "br2-att2",
    routerLink: "r4-sw2",
    dnsLink: "r4-dnsbr",
    rogue: "BR-ATT-2"
  }
};

function isRunActive(runId) {
  return isRunning && runId === currentRunId;
}

function wait(ms, runId) {
  return new Promise(resolve => {
    if (!isRunActive(runId)) {
      resolve(false);
      return;
    }

    const timerItem = {
      timer: null,
      resolve
    };

    timerItem.timer = setTimeout(() => {
      pendingTimers.delete(timerItem);
      resolve(isRunActive(runId));
    }, ms);

    pendingTimers.add(timerItem);
  });
}

function clearPendingTimers() {
  pendingTimers.forEach(timerItem => {
    clearTimeout(timerItem.timer);
    timerItem.resolve(false);
  });

  pendingTimers.clear();
}

function logMessage(message, type = "neutral") {
  const p = document.createElement("p");
  p.className = `log-line ${type}-log`;
  p.textContent = message;
  packetOutput.appendChild(p);
  packetOutput.scrollTop = packetOutput.scrollHeight;
}

function setValidationMessage(message, mode = "neutral") {
  validationStatus.innerHTML = message;
  validationStatus.classList.remove("validation-ok", "validation-warn");

  if (mode === "ok") {
    validationStatus.classList.add("validation-ok");
  }

  if (mode === "warn") {
    validationStatus.classList.add("validation-warn");
  }
}

function clearLogs() {
  packetOutput.innerHTML = "";
  logMessage("[System] DNS simulation reset. Waiting for new validation input...", "neutral");
}

function clearPackets() {
  activePackets.forEach(packet => packet.remove());
  activePackets = [];
}

function clearLineHighlights() {
  document
    .querySelectorAll(".line-arp, .line-data, .line-attack, .line-dhcp, .line-dns")
    .forEach(line => {
      line.classList.remove("line-arp", "line-data", "line-attack", "line-dhcp", "line-dns");
    });
}

function disableControlsForRun() {
  predefinedNormalBtn.disabled = true;
  predefinedAttackBtn.disabled = true;
  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;
  validatePairBtn.disabled = true;

  resetSimulationBtn.disabled = false;

  sourceIpInput.disabled = true;
  destinationIpInput.disabled = true;
}

function enableControlsAfterRun() {
  predefinedNormalBtn.disabled = false;
  predefinedAttackBtn.disabled = false;
  validatePairBtn.disabled = false;
  resetSimulationBtn.disabled = false;

  sourceIpInput.disabled = false;
  destinationIpInput.disabled = false;

  validatePair();
}

function beginRun() {
  if (isRunning) {
    return null;
  }

  currentRunId += 1;
  isRunning = true;

  clearPendingTimers();
  disableControlsForRun();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  return currentRunId;
}

function finishRun(runId) {
  if (!isRunActive(runId)) {
    return;
  }

  isRunning = false;
  enableControlsAfterRun();
}

function resetSimulation() {
  currentRunId += 1;
  isRunning = false;

  clearPendingTimers();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  predefinedNormalBtn.disabled = false;
  predefinedAttackBtn.disabled = false;
  validatePairBtn.disabled = false;
  resetSimulationBtn.disabled = false;

  sourceIpInput.disabled = false;
  destinationIpInput.disabled = false;

  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;

  validatePair();
}

function createPacket(label, kind) {
  const packet = document.createElement("div");
  packet.className = `packet packet-${kind}`;
  packet.textContent = label;
  packetLayer.appendChild(packet);
  activePackets.push(packet);
  return packet;
}

function getShellPointFromLine(line, progress, reverse = false) {
  const length = line.getTotalLength();
  const actualProgress = reverse ? 1 - progress : progress;
  const point = line.getPointAtLength(length * actualProgress);
  const matrix = line.getScreenCTM();
  const screenPoint = point.matrixTransform(matrix);
  const shellRect = topologyShell.getBoundingClientRect();

  return {
    x: screenPoint.x - shellRect.left,
    y: screenPoint.y - shellRect.top
  };
}

function flashLine(lineId, kind) {
  const line = document.getElementById(lineId);

  if (!line) {
    return;
  }

  line.classList.remove("line-arp", "line-data", "line-attack", "line-dhcp", "line-dns");
  line.classList.add(`line-${kind}`);
}

function normalSegment(id) {
  return { id, reverse: false };
}

function reverseSegment(id) {
  return { id, reverse: true };
}

async function animateOnLine(packet, segment, duration, kind, runId) {
  const line = document.getElementById(segment.id);

  if (!line || !isRunActive(runId)) {
    return false;
  }

  flashLine(segment.id, kind);
  packet.classList.add("show");

  return new Promise(resolve => {
    const start = performance.now();

    function frame(now) {
      if (!isRunActive(runId)) {
        resolve(false);
        return;
      }

      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const point = getShellPointFromLine(line, progress, segment.reverse);

      packet.style.left = `${point.x}px`;
      packet.style.top = `${point.y}px`;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve(true);
      }
    }

    requestAnimationFrame(frame);
  });
}

async function animatePath(packet, segments, durationPerLine, kind, runId, delayBetween = SPEED.lineGap) {
  for (const segment of segments) {
    if (!isRunActive(runId)) {
      return false;
    }

    const animated = await animateOnLine(packet, segment, durationPerLine, kind, runId);

    if (!animated || !isRunActive(runId)) {
      return false;
    }

    const stillActive = await wait(delayBetween, runId);

    if (!stillActive) {
      return false;
    }
  }

  return true;
}

function sourceToSwitch(node) {
  const meta = SWITCH_META[node.switch];

  return [
    reverseSegment(node.access),
    normalSegment(meta.bus),
    reverseSegment(meta.up)
  ];
}

function switchToSource(node) {
  const meta = SWITCH_META[node.switch];

  return [
    normalSegment(meta.up),
    normalSegment(meta.bus),
    normalSegment(node.access)
  ];
}

function switchToRouter(node) {
  const meta = SWITCH_META[node.switch];

  return [
    reverseSegment(meta.routerLink)
  ];
}

function routerToSwitch(node) {
  const meta = SWITCH_META[node.switch];

  return [
    normalSegment(meta.routerLink)
  ];
}

function routerToDnsServer(branch) {
  return [
    normalSegment(branch === "HQ" ? "r1-dnshq" : "r4-dnsbr")
  ];
}

function dnsServerToRouter(branch) {
  return [
    reverseSegment(branch === "HQ" ? "r1-dnshq" : "r4-dnsbr")
  ];
}

function sourceToAttacker(node) {
  const meta = SWITCH_META[node.switch];

  return [
    reverseSegment(node.access),
    normalSegment(meta.bus),
    normalSegment(meta.attacker)
  ];
}

function attackerToSource(node) {
  const meta = SWITCH_META[node.switch];

  return [
    reverseSegment(meta.attacker),
    normalSegment(meta.bus),
    normalSegment(node.access)
  ];
}

function getDnsServerName(branch) {
  return branch === "HQ" ? "DNS-CENTRAL" : "DNS-BR";
}

function getDnsServerIp(branch) {
  return branch === "HQ" ? "192.168.10.53" : "192.168.20.53";
}

function getRogueName(srcNode) {
  return SWITCH_META[srcNode.switch].rogue;
}

function getDnsNormalRoute(srcNode) {
  return {
    query: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode),
      ...routerToDnsServer(srcNode.branch)
    ],
    response: [
      ...dnsServerToRouter(srcNode.branch),
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    serverName: getDnsServerName(srcNode.branch),
    serverIp: getDnsServerIp(srcNode.branch)
  };
}

function getDnsAttackRoute(srcNode) {
  return {
    legitQuery: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode),
      ...routerToDnsServer(srcNode.branch)
    ],
    legitResponse: [
      ...dnsServerToRouter(srcNode.branch),
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    rogueQuery: [
      ...sourceToAttacker(srcNode)
    ],
    rogueResponse: [
      ...attackerToSource(srcNode)
    ],
    rogueName: getRogueName(srcNode),
    serverName: getDnsServerName(srcNode.branch),
    serverIp: getDnsServerIp(srcNode.branch)
  };
}

function validatePair() {
  const sourceIp = sourceIpInput.value.trim();
  const destinationIp = destinationIpInput.value.trim();

  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;

  if (isRunning) {
    return null;
  }

  if (!sourceIp && !destinationIp) {
    setValidationMessage('Enter source/client IP and DNS server IP, then click <strong>Validate Pair</strong>.');
    return null;
  }

  if (!sourceIp || !destinationIp) {
    setValidationMessage("Both source/client IP and DNS server IP are required before DNS testing can start.", "warn");
    return null;
  }

  const src = NODE_MAP[sourceIp];
  const dst = NODE_MAP[destinationIp];

  if (!src || !dst) {
    setValidationMessage(
      "Invalid source or DNS server IP. Use only mapped DNS topology IPs: HQ PCs 192.168.10.101-104, BR PCs 192.168.20.101-104, DNS-CENTRAL 192.168.10.53, or DNS-BR 192.168.20.53.",
      "warn"
    );
    return null;
  }

  if (sourceIp === destinationIp) {
    setValidationMessage("Invalid DNS test. The client and DNS server cannot be the same device.", "warn");
    return null;
  }

  if (src.type !== "pc") {
    setValidationMessage("Invalid DNS source. The source must be a client PC sending a DNS query.", "warn");
    return null;
  }

  if (dst.type !== "dns") {
    setValidationMessage("Invalid DNS destination. The destination must be a DNS server: DNS-CENTRAL or DNS-BR.", "warn");
    return null;
  }

  if (src.branch !== dst.branch) {
    const correctServerName = getDnsServerName(src.branch);
    const correctServerIp = getDnsServerIp(src.branch);

    setValidationMessage(
      `Invalid DNS path: ${src.name} belongs to the ${src.branch} LAN, but ${dst.name} is in the ${dst.branch} LAN. Use ${correctServerName} (${correctServerIp}) for this client. Normal and attack buttons remain disabled.`,
      "warn"
    );
    return null;
  }

  const rogueName = getRogueName(src);

  manualNormalBtn.disabled = false;
  manualAttackBtn.disabled = false;

  setValidationMessage(
    `Valid DNS path detected: <strong>${src.name} → ${dst.name}</strong>.<br>` +
    `Normal test: <strong>available</strong> using legitimate DNS query and response behaviour.<br>` +
    `Attack test: <strong>available</strong> because ${rogueName} can act as a rogue DNS responder for this client-side LAN model.`,
    "ok"
  );

  return {
    src,
    dst,
    normalAllowed: true,
    attackAllowed: true,
    rogueName
  };
}

async function runDnsNormalSimulation(srcNode, runId) {
  const route = getDnsNormalRoute(srcNode);

  const query = createPacket("DNS Q", "dns");
  logMessage(`[Step 1] ${srcNode.name} sends a DNS query to ${route.serverName} asking for a domain name to be resolved into an IP address.`, "neutral");
  if (!(await animatePath(query, route.query, SPEED.lineDuration, "dns", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const response = createPacket("DNS R", "dns");
  logMessage(`[Step 2] ${route.serverName} returns a legitimate DNS response containing the correct IP address for the requested domain.`, "success");
  if (!(await animatePath(response, route.response, SPEED.lineDuration, "dns", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  return true;
}

async function runDnsAttackSimulation(srcNode, runId) {
  const route = getDnsAttackRoute(srcNode);

  const legitQuery = createPacket("DNS Q", "dns");
  logMessage(`[Step 1] ${srcNode.name} first sends a legitimate DNS query toward ${route.serverName}.`, "neutral");
  if (!(await animatePath(legitQuery, route.legitQuery, SPEED.lineDuration, "dns", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const legitResponse = createPacket("DNS OK", "dns");
  logMessage(`[Step 2] ${route.serverName} returns the trusted IP address. This represents normal DNS behaviour before manipulation is introduced.`, "success");
  if (!(await animatePath(legitResponse, route.legitResponse, SPEED.lineDuration, "dns", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const rogueQuery = createPacket("DNS Q", "attack");
  logMessage(`[Step 3] The client is influenced to query ${route.rogueName}, which is acting as a rogue DNS responder on the local access-side model.`, "attack");
  if (!(await animatePath(rogueQuery, route.rogueQuery, SPEED.lineDuration, "attack", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const rogueResponse = createPacket("FAKE IP", "attack");
  logMessage(`[Step 4] ${route.rogueName} returns a forged DNS response with a malicious IP address, redirecting the client away from the legitimate destination.`, "attack");
  if (!(await animatePath(rogueResponse, route.rogueResponse, SPEED.lineDuration, "attack", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  return true;
}

async function runPredefinedNormalDemo() {
  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    const src = NODE_MAP["192.168.10.101"];
    const dst = NODE_MAP["192.168.10.53"];

    logMessage("[Normal Demo] Starting HQ DNS normal resolution: HQ-PC1 → DNS-CENTRAL", "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDnsNormalSimulation(src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] DNS normal resolution completed successfully for ${src.name} using ${dst.name}.`, "success");
  } finally {
    finishRun(runId);
  }
}

async function runPredefinedAttackDemo() {
  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    const src = NODE_MAP["192.168.10.101"];
    const dst = NODE_MAP["192.168.10.53"];
    const rogueName = getRogueName(src);

    logMessage(`[Attack Demo] Starting HQ rogue DNS scenario: ${src.name} uses ${dst.name}, then ${rogueName} returns a forged IP address`, "attack");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDnsAttackSimulation(src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Rogue DNS attack completed. ${rogueName} returned a forged IP address to ${src.name}.`, "attack");
  } finally {
    finishRun(runId);
  }
}

async function runManualNormal() {
  const result = validatePair();

  if (!result || !result.normalAllowed || isRunning) {
    return;
  }

  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    logMessage(`[Manual Normal] Starting DNS normal sequence: ${result.src.name} → ${result.dst.name}`, "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDnsNormalSimulation(result.src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Manual DNS normal sequence completed. ${result.src.name} received a legitimate response from ${result.dst.name}.`, "success");
  } finally {
    finishRun(runId);
  }
}

async function runManualAttack() {
  const result = validatePair();

  if (!result || !result.attackAllowed || isRunning) {
    return;
  }

  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    logMessage(`[Manual Attack] Starting rogue DNS sequence: ${result.src.name} exposed to ${result.rogueName}`, "attack");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDnsAttackSimulation(result.src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Manual DNS attack sequence completed. ${result.rogueName} successfully returned a forged DNS response.`, "attack");
  } finally {
    finishRun(runId);
  }
}

predefinedNormalBtn.addEventListener("click", runPredefinedNormalDemo);
predefinedAttackBtn.addEventListener("click", runPredefinedAttackDemo);
manualNormalBtn.addEventListener("click", runManualNormal);
manualAttackBtn.addEventListener("click", runManualAttack);
validatePairBtn.addEventListener("click", validatePair);
resetSimulationBtn.addEventListener("click", resetSimulation);

sourceIpInput.addEventListener("input", validatePair);
destinationIpInput.addEventListener("input", validatePair);

window.addEventListener("load", () => {
  resetSimulation();
  logMessage("[System] DNS topology data loaded successfully.", "success");
});