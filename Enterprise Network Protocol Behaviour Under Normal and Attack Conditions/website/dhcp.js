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
  stepPause: 4500,
  startPause: 7000
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

  "192.168.10.10": { name: "DHCP-HQ", branch: "HQ", type: "dhcp" },
  "192.168.20.10": { name: "DHCP-BR", branch: "BR", type: "dhcp" }
};

const SWITCH_META = {
  hq1: {
    bus: "hq1-bus",
    up: "hq1-up",
    attacker: "hq1-att1",
    routerLink: "r1-sw1",
    dhcpLink: "r1-dhcphq",
    rogue: "HQ-ATT-1"
  },
  hq2: {
    bus: "hq2-bus",
    up: "hq2-up",
    attacker: "hq2-att2",
    routerLink: "r1-sw2",
    dhcpLink: "r1-dhcphq",
    rogue: "HQ-ATT-2"
  },
  br1: {
    bus: "br1-bus",
    up: "br1-up",
    attacker: "br1-att1",
    routerLink: "r4-sw1",
    dhcpLink: "r4-dhcpbr",
    rogue: "BR-ATT-1"
  },
  br2: {
    bus: "br2-bus",
    up: "br2-up",
    attacker: "br2-att2",
    routerLink: "r4-sw2",
    dhcpLink: "r4-dhcpbr",
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
  logMessage("[System] DHCP simulation reset. Waiting for new validation input...", "neutral");
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

function routerToDhcpServer(branch) {
  return [
    normalSegment(branch === "HQ" ? "r1-dhcphq" : "r4-dhcpbr")
  ];
}

function dhcpServerToRouter(branch) {
  return [
    reverseSegment(branch === "HQ" ? "r1-dhcphq" : "r4-dhcpbr")
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

function getDhcpServerName(branch) {
  return branch === "HQ" ? "DHCP-HQ" : "DHCP-BR";
}

function getDhcpServerIp(branch) {
  return branch === "HQ" ? "192.168.10.10" : "192.168.20.10";
}

function getRogueName(srcNode) {
  return SWITCH_META[srcNode.switch].rogue;
}

function getDhcpNormalRoute(srcNode) {
  return {
    discover: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode),
      ...routerToDhcpServer(srcNode.branch)
    ],
    offer: [
      ...dhcpServerToRouter(srcNode.branch),
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    request: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode),
      ...routerToDhcpServer(srcNode.branch)
    ],
    ack: [
      ...dhcpServerToRouter(srcNode.branch),
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    serverName: getDhcpServerName(srcNode.branch),
    serverIp: getDhcpServerIp(srcNode.branch)
  };
}

function getDhcpAttackRoute(srcNode) {
  return {
    discover: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode),
      ...routerToDhcpServer(srcNode.branch)
    ],
    rogueOffer: [
      ...attackerToSource(srcNode)
    ],
    legitOffer: [
      ...dhcpServerToRouter(srcNode.branch),
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    requestToRogue: [
      ...sourceToAttacker(srcNode)
    ],
    rogueAck: [
      ...attackerToSource(srcNode)
    ],
    rogueName: getRogueName(srcNode),
    serverName: getDhcpServerName(srcNode.branch),
    serverIp: getDhcpServerIp(srcNode.branch)
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
    setValidationMessage('Enter client and DHCP server IPs, then click <strong>Validate Pair</strong>.');
    return null;
  }

  if (!sourceIp || !destinationIp) {
    setValidationMessage("Both client IP and DHCP server IP are required before DHCP testing can start.", "warn");
    return null;
  }

  const src = NODE_MAP[sourceIp];
  const dst = NODE_MAP[destinationIp];

  if (!src || !dst) {
    setValidationMessage(
      "Invalid client or DHCP server IP. Use only mapped DHCP topology IPs: HQ PCs 192.168.10.101-104, BR PCs 192.168.20.101-104, DHCP-HQ 192.168.10.10, or DHCP-BR 192.168.20.10.",
      "warn"
    );
    return null;
  }

  if (sourceIp === destinationIp) {
    setValidationMessage("Invalid DHCP test. The client and DHCP server cannot be the same device.", "warn");
    return null;
  }

  if (src.type !== "pc") {
    setValidationMessage("Invalid DHCP source. The source must be a client PC requesting network configuration.", "warn");
    return null;
  }

  if (dst.type !== "dhcp") {
    setValidationMessage("Invalid DHCP destination. The destination must be a DHCP server: DHCP-HQ or DHCP-BR.", "warn");
    return null;
  }

  if (src.branch !== dst.branch) {
    const correctServerName = getDhcpServerName(src.branch);
    const correctServerIp = getDhcpServerIp(src.branch);

    setValidationMessage(
      `Invalid DHCP path: ${src.name} belongs to the ${src.branch} LAN, but ${dst.name} is in the ${dst.branch} LAN. Use ${correctServerName} (${correctServerIp}) for this client. Normal and attack buttons remain disabled.`,
      "warn"
    );
    return null;
  }

  const rogueName = getRogueName(src);

  manualNormalBtn.disabled = false;
  manualAttackBtn.disabled = false;

  setValidationMessage(
    `Valid DHCP path detected: <strong>${src.name} → ${dst.name}</strong>.<br>` +
    `Normal test: <strong>available</strong> using the DHCP DORA sequence.<br>` +
    `Attack test: <strong>available</strong> because ${rogueName} is present on the same access-side model and can compete with a rogue DHCP Offer.`,
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

async function runDhcpNormalSimulation(srcNode, runId) {
  const route = getDhcpNormalRoute(srcNode);

  const discover = createPacket("DISC", "dhcp");
  logMessage(`[Step 1] ${srcNode.name} has no valid lease, so it broadcasts DHCP Discover to locate an available DHCP server.`, "neutral");
  if (!(await animatePath(discover, route.discover, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const offer = createPacket("OFER", "dhcp");
  logMessage(`[Step 2] ${route.serverName} responds with DHCP Offer, proposing an IP address, lease time, gateway, and DNS configuration.`, "neutral");
  if (!(await animatePath(offer, route.offer, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const request = createPacket("REQ", "dhcp");
  logMessage(`[Step 3] ${srcNode.name} sends DHCP Request to accept the offered configuration from ${route.serverName}.`, "neutral");
  if (!(await animatePath(request, route.request, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const ack = createPacket("ACK", "dhcp");
  logMessage(`[Step 4] ${route.serverName} returns DHCP Ack. The lease is confirmed and ${srcNode.name} can now use the assigned network settings.`, "success");
  if (!(await animatePath(ack, route.ack, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  return true;
}

async function runDhcpAttackSimulation(srcNode, runId) {
  const route = getDhcpAttackRoute(srcNode);

  const discover = createPacket("DISC", "dhcp");
  logMessage(`[Step 1] ${srcNode.name} broadcasts DHCP Discover. Both the legitimate DHCP service and a rogue responder can observe this broadcast.`, "neutral");
  if (!(await animatePath(discover, route.discover, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const rogueOffer = createPacket("ROG", "attack");
  logMessage(`[Step 2] ${route.rogueName} acts as a rogue DHCP server and sends a forged DHCP Offer before the legitimate offer is trusted.`, "attack");
  if (!(await animatePath(rogueOffer, route.rogueOffer, SPEED.lineDuration, "attack", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const legitOffer = createPacket("OFER", "dhcp");
  logMessage(`[Step 3] ${route.serverName} also sends a legitimate DHCP Offer, but the client is now exposed to competing configuration choices.`, "warning");
  if (!(await animatePath(legitOffer, route.legitOffer, SPEED.lineDuration, "dhcp", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const requestToRogue = createPacket("REQ", "attack");
  logMessage(`[Step 4] ${srcNode.name} accepts the rogue offer and sends DHCP Request toward ${route.rogueName}.`, "attack");
  if (!(await animatePath(requestToRogue, route.requestToRogue, SPEED.lineDuration, "attack", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  const rogueAck = createPacket("ACK", "attack");
  logMessage(`[Step 5] ${route.rogueName} returns a rogue DHCP Ack. The victim may now receive a malicious gateway, DNS server, or incorrect IP configuration.`, "attack");
  if (!(await animatePath(rogueAck, route.rogueAck, SPEED.lineDuration, "attack", runId))) return false;

  if (!(await wait(SPEED.stepPause, runId))) return false;

  return true;
}

async function runPredefinedNormalDemo() {
  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    const src = NODE_MAP["192.168.20.101"];
    const dst = NODE_MAP["192.168.20.10"];

    logMessage("[Normal Demo] Starting BR DHCP normal DORA sequence: BR-PC1 → DHCP-BR", "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDhcpNormalSimulation(src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] DHCP normal lease allocation completed successfully for ${src.name} using ${dst.name}.`, "success");
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
    const dst = NODE_MAP["192.168.10.10"];
    const rogueName = getRogueName(src);

    logMessage(`[Attack Demo] Starting HQ rogue DHCP scenario: ${src.name} with ${rogueName} competing against ${dst.name}`, "attack");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDhcpAttackSimulation(src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Rogue DHCP attack completed. ${src.name} accepted malicious or incorrect configuration from ${rogueName}.`, "attack");
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
    logMessage(`[Manual Normal] Starting DHCP normal DORA sequence: ${result.src.name} → ${result.dst.name}`, "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDhcpNormalSimulation(result.src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Manual DHCP normal sequence completed. ${result.src.name} received a valid lease from ${result.dst.name}.`, "success");
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
    logMessage(`[Manual Attack] Starting rogue DHCP scenario: ${result.src.name} exposed to ${result.rogueName}`, "attack");

    if (!(await wait(SPEED.startPause, runId))) return;

    const completed = await runDhcpAttackSimulation(result.src, runId);

    if (!completed || !isRunActive(runId)) return;

    logMessage(`[Complete] Manual DHCP attack sequence completed. ${result.rogueName} successfully competed with the legitimate DHCP process.`, "attack");
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
  logMessage("[System] DHCP topology data loaded successfully.", "success");
});