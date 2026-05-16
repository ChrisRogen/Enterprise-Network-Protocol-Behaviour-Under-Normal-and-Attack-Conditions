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
  "192.168.10.1":   { name: "R1-HQ",  branch: "HQ", switch: null,  type: "gateway" },

  "192.168.20.101": { name: "BR-PC1", branch: "BR", switch: "br1", type: "pc", access: "br1-pc1" },
  "192.168.20.102": { name: "BR-PC2", branch: "BR", switch: "br1", type: "pc", access: "br1-pc2" },
  "192.168.20.103": { name: "BR-PC3", branch: "BR", switch: "br2", type: "pc", access: "br2-pc3" },
  "192.168.20.104": { name: "BR-PC4", branch: "BR", switch: "br2", type: "pc", access: "br2-pc4" },
  "192.168.20.1":   { name: "R4-BR",  branch: "BR", switch: null,  type: "gateway" }
};

const SWITCH_META = {
  hq1: { bus: "hq1-bus", up: "hq1-up", attacker: "hq1-att1", routerLink: "r1-sw1", gateway: "R1-HQ", attackerName: "HQ-ATT-1" },
  hq2: { bus: "hq2-bus", up: "hq2-up", attacker: "hq2-att2", routerLink: "r1-sw2", gateway: "R1-HQ", attackerName: "HQ-ATT-2" },
  br1: { bus: "br1-bus", up: "br1-up", attacker: "br1-att1", routerLink: "r4-sw1", gateway: "R4-BR", attackerName: "BR-ATT-1" },
  br2: { bus: "br2-bus", up: "br2-up", attacker: "br2-att2", routerLink: "r4-sw2", gateway: "R4-BR", attackerName: "BR-ATT-2" }
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
  logMessage("[System] ARP simulation reset. Waiting for new validation input...", "neutral");
}

function clearPackets() {
  activePackets.forEach(packet => packet.remove());
  activePackets = [];
}

function clearLineHighlights() {
  document.querySelectorAll(".line-arp, .line-data, .line-attack").forEach(line => {
    line.classList.remove("line-arp", "line-data", "line-attack");
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
  if (!line) return;

  line.classList.remove("line-arp", "line-data", "line-attack");
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

function getGatewayInfo(branch) {
  return branch === "HQ"
    ? { name: "R1-HQ", ip: "192.168.10.1" }
    : { name: "R4-BR", ip: "192.168.20.1" };
}

function getAttackerName(switchId) {
  return SWITCH_META[switchId].attackerName;
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

function attackerToRouter(node) {
  const meta = SWITCH_META[node.switch];

  return [
    reverseSegment(meta.attacker),
    normalSegment(meta.bus),
    reverseSegment(meta.up),
    reverseSegment(meta.routerLink)
  ];
}

function attackerToDestination(srcNode, dstNode) {
  const meta = SWITCH_META[srcNode.switch];

  return [
    reverseSegment(meta.attacker),
    normalSegment(meta.bus),
    normalSegment(dstNode.access)
  ];
}

function routerToDestination(dstNode) {
  const meta = SWITCH_META[dstNode.switch];

  return [
    normalSegment(meta.routerLink),
    normalSegment(meta.up),
    normalSegment(meta.bus),
    normalSegment(dstNode.access)
  ];
}

function destinationToRouter(dstNode) {
  const meta = SWITCH_META[dstNode.switch];

  return [
    reverseSegment(dstNode.access),
    normalSegment(meta.bus),
    reverseSegment(meta.up),
    reverseSegment(meta.routerLink)
  ];
}

function getSameSwitchRoute(srcNode, dstNode) {
  const meta = SWITCH_META[srcNode.switch];

  return {
    arpRequest: [
      reverseSegment(srcNode.access),
      normalSegment(meta.bus),
      normalSegment(dstNode.access)
    ],
    arpReply: [
      reverseSegment(dstNode.access),
      normalSegment(meta.bus),
      normalSegment(srcNode.access)
    ],
    dataFrame: [
      reverseSegment(srcNode.access),
      normalSegment(meta.bus),
      normalSegment(dstNode.access)
    ]
  };
}

function getGatewayRoute(srcNode) {
  return {
    arpRequest: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode)
    ],
    arpReply: [
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    dataFrame: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode)
    ],
    gateway: getGatewayInfo(srcNode.branch)
  };
}

function getCrossSwitchRoute(srcNode, dstNode) {
  return {
    phase1Request: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode)
    ],
    phase1Reply: [
      ...routerToSwitch(srcNode),
      ...switchToSource(srcNode)
    ],
    phase2DataToRouter: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode)
    ],
    phase3RequestToDst: [
      ...routerToDestination(dstNode)
    ],
    phase3ReplyToRouter: [
      ...destinationToRouter(dstNode)
    ],
    phase4ForwardedData: [
      ...routerToDestination(dstNode)
    ],
    gateway: getGatewayInfo(srcNode.branch)
  };
}

function getGatewayAttackRoute(srcNode) {
  return {
    normalRequest: [
      ...sourceToSwitch(srcNode),
      ...switchToRouter(srcNode)
    ],
    forgedReply: [
      ...attackerToSource(srcNode)
    ],
    poisonedData: [
      ...sourceToAttacker(srcNode)
    ],
    attackerForward: [
      ...attackerToRouter(srcNode)
    ],
    gateway: getGatewayInfo(srcNode.branch),
    attackerName: getAttackerName(srcNode.switch)
  };
}

function getSameSwitchHostAttackRoute(srcNode, dstNode) {
  const normalRoute = getSameSwitchRoute(srcNode, dstNode);

  return {
    normalRequest: normalRoute.arpRequest,
    forgedReply: [
      ...attackerToSource(srcNode)
    ],
    poisonedData: [
      ...sourceToAttacker(srcNode)
    ],
    attackerForward: [
      ...attackerToDestination(srcNode, dstNode)
    ],
    attackerName: getAttackerName(srcNode.switch),
    targetName: dstNode.name
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
    setValidationMessage('Enter source and destination IPs, then click <strong>Validate Pair</strong>.');
    return null;
  }

  if (!sourceIp || !destinationIp) {
    setValidationMessage("Both source IP and destination IP are required before ARP testing can start.", "warn");
    return null;
  }

  const src = NODE_MAP[sourceIp];
  const dst = NODE_MAP[destinationIp];

  if (!src || !dst) {
    setValidationMessage(
      "Invalid source or destination IP. Use only mapped ARP topology IPs: HQ PCs 192.168.10.101-104, HQ gateway 192.168.10.1, BR PCs 192.168.20.101-104, or BR gateway 192.168.20.1.",
      "warn"
    );
    return null;
  }

  if (sourceIp === destinationIp) {
    setValidationMessage("Invalid ARP test. Source and destination cannot be the same device.", "warn");
    return null;
  }

  if (src.type !== "pc") {
    setValidationMessage("Invalid ARP source. The source must be a PC host because this simulator models client ARP behaviour.", "warn");
    return null;
  }

  if (dst.type !== "pc" && dst.type !== "gateway") {
    setValidationMessage("Invalid ARP destination. The destination must be either another PC or the branch gateway.", "warn");
    return null;
  }

  if (src.branch !== dst.branch) {
    setValidationMessage(
      `Invalid ARP path: ${src.name} and ${dst.name} are in different branches. ARP is a local LAN process and does not resolve addresses across routed branch networks.`,
      "warn"
    );
    return null;
  }

  let normalAllowed = true;
  let attackAllowed = false;
  let scenario = "";
  let attackReason = "";

  if (dst.type === "gateway") {
    attackAllowed = true;
    scenario = `Valid PC-to-gateway ARP path detected: <strong>${src.name} → ${dst.name}</strong>.`;
    attackReason = "Gateway spoofing is available because the attacker can claim the gateway IP belongs to the attacker MAC.";
  } else if (dst.type === "pc" && src.switch === dst.switch) {
    attackAllowed = true;
    scenario = `Valid same-switch PC-to-PC ARP path detected: <strong>${src.name} → ${dst.name}</strong>.`;
    attackReason = "Same-switch host spoofing is available because the attacker is on the same access switch segment.";
  } else if (dst.type === "pc" && src.switch !== dst.switch) {
    attackAllowed = false;
    scenario = `Valid cross-switch same-branch ARP normal path detected: <strong>${src.name} → ${dst.name}</strong>.`;
    attackReason = "Manual attack is disabled because this implemented ARP spoofing model only supports same-switch host spoofing or PC-to-gateway spoofing.";
  }

  manualNormalBtn.disabled = !normalAllowed;
  manualAttackBtn.disabled = !attackAllowed;

  setValidationMessage(
    `${scenario}<br>Normal test: <strong>available</strong>.<br>Attack test: <strong>${attackAllowed ? "available" : "disabled"}</strong>. ${attackReason}`,
    "ok"
  );

  return {
    src,
    dst,
    normalAllowed,
    attackAllowed
  };
}

async function runPredefinedNormalDemo() {
  const runId = beginRun();

  if (!runId) {
    return;
  }

  try {
    const src = NODE_MAP["192.168.20.101"];
    const dst = NODE_MAP["192.168.20.103"];
    const route = getCrossSwitchRoute(src, dst);

    logMessage("[Normal Demo] Starting cross-switch BR LAN communication: BR-PC1 → BR-PC3", "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    const arpReq1 = createPacket("ARP", "arp");
    logMessage("[Step 1] BR-PC1 checks its ARP cache. Because the next-hop MAC is unknown, it sends an ARP request toward R4-BR.", "neutral");
    if (!(await animatePath(arpReq1, route.phase1Request, SPEED.lineDuration, "arp", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const arpRep1 = createPacket("ARP", "arp");
    logMessage("[Step 2] R4-BR replies with its MAC address. BR-PC1 can now build the ARP mapping for its gateway.", "neutral");
    if (!(await animatePath(arpRep1, route.phase1Reply, SPEED.lineDuration, "arp", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const dataToRouter = createPacket("DATA", "data");
    logMessage("[Step 3] BR-PC1 sends the data frame to R4-BR. The IP destination remains BR-PC3, but the Ethernet destination MAC is R4-BR.", "success");
    if (!(await animatePath(dataToRouter, route.phase2DataToRouter, SPEED.lineDuration, "data", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const arpReq2 = createPacket("ARP", "arp");
    logMessage("[Step 4] R4-BR needs the MAC address for BR-PC3, so it performs ARP on the destination switch side.", "neutral");
    if (!(await animatePath(arpReq2, route.phase3RequestToDst, SPEED.lineDuration, "arp", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const arpRep2 = createPacket("ARP", "arp");
    logMessage("[Step 5] BR-PC3 replies to R4-BR with its MAC address.", "neutral");
    if (!(await animatePath(arpRep2, route.phase3ReplyToRouter, SPEED.lineDuration, "arp", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const forwardedData = createPacket("DATA", "data");
    logMessage("[Step 6] R4-BR forwards the packet to BR-PC3. The router rewrites the Ethernet destination MAC to BR-PC3.", "success");
    if (!(await animatePath(forwardedData, route.phase4ForwardedData, SPEED.lineDuration, "data", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    logMessage("[Complete] Normal ARP-supported cross-switch communication completed successfully.", "success");
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
    const dst = NODE_MAP["192.168.10.1"];
    const route = getGatewayAttackRoute(src);

    logMessage("[Attack Demo] Starting HQ ARP spoofing path: HQ-PC1 → R1-HQ through HQ-ATT-1", "attack");

    if (!(await wait(SPEED.startPause, runId))) return;

    const arpReq = createPacket("ARP", "arp");
    logMessage("[Step 1] HQ-PC1 sends a normal ARP request to resolve the MAC address of the HQ gateway R1-HQ.", "neutral");
    if (!(await animatePath(arpReq, route.normalRequest, SPEED.lineDuration, "arp", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const forgedReply = createPacket("FAKE", "attack");
    logMessage("[Step 2] HQ-ATT-1 sends a forged ARP reply, claiming that gateway IP 192.168.10.1 belongs to the attacker MAC.", "attack");
    if (!(await animatePath(forgedReply, route.forgedReply, SPEED.lineDuration, "attack", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const poisonedData = createPacket("DATA", "attack");
    logMessage("[Step 3] HQ-PC1 updates its ARP cache incorrectly and sends traffic to HQ-ATT-1 instead of directly to R1-HQ.", "attack");
    if (!(await animatePath(poisonedData, route.poisonedData, SPEED.lineDuration, "attack", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    const attackerForward = createPacket("DATA", "data");
    logMessage("[Step 4] HQ-ATT-1 forwards the intercepted traffic onward to R1-HQ, demonstrating a man-in-the-middle path.", "attack");
    if (!(await animatePath(attackerForward, route.attackerForward, SPEED.lineDuration, "data", runId))) return;

    if (!(await wait(SPEED.stepPause, runId))) return;

    logMessage(`[Complete] ARP spoofing attack completed. ${src.name} was redirected through ${route.attackerName} while attempting to reach ${dst.name}.`, "attack");
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
    const { src, dst } = result;

    logMessage(`[Manual Normal] Starting normal ARP communication: ${src.name} → ${dst.name}`, "success");

    if (!(await wait(SPEED.startPause, runId))) return;

    if (dst.type === "gateway") {
      const route = getGatewayRoute(src);

      const arpReq = createPacket("ARP", "arp");
      logMessage(`[Step 1] ${src.name} checks the ARP cache and sends an ARP request for gateway ${dst.name}.`, "neutral");
      if (!(await animatePath(arpReq, route.arpRequest, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const arpRep = createPacket("ARP", "arp");
      logMessage(`[Step 2] ${dst.name} replies with its MAC address, allowing ${src.name} to build a valid gateway ARP entry.`, "neutral");
      if (!(await animatePath(arpRep, route.arpReply, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const dataPkt = createPacket("DATA", "data");
      logMessage(`[Step 3] ${src.name} sends the data frame toward ${dst.name} using the correct gateway MAC address.`, "success");
      if (!(await animatePath(dataPkt, route.dataFrame, SPEED.lineDuration, "data", runId))) return;
    } else if (src.switch === dst.switch) {
      const route = getSameSwitchRoute(src, dst);

      const arpReq = createPacket("ARP", "arp");
      logMessage(`[Step 1] ${src.name} sends an ARP request for ${dst.name} on the same switch segment.`, "neutral");
      if (!(await animatePath(arpReq, route.arpRequest, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const arpRep = createPacket("ARP", "arp");
      logMessage(`[Step 2] ${dst.name} replies with its MAC address. The local ARP cache now has the correct IP-to-MAC mapping.`, "neutral");
      if (!(await animatePath(arpRep, route.arpReply, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const dataPkt = createPacket("DATA", "data");
      logMessage(`[Step 3] ${src.name} sends the data frame directly to ${dst.name} across the same switch bus.`, "success");
      if (!(await animatePath(dataPkt, route.dataFrame, SPEED.lineDuration, "data", runId))) return;
    } else {
      const route = getCrossSwitchRoute(src, dst);

      const arpReq1 = createPacket("ARP", "arp");
      logMessage(`[Step 1] ${src.name} needs a next-hop MAC address and sends an ARP request toward branch gateway ${route.gateway.name}.`, "neutral");
      if (!(await animatePath(arpReq1, route.phase1Request, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const arpRep1 = createPacket("ARP", "arp");
      logMessage(`[Step 2] ${route.gateway.name} replies with its MAC address for the first Ethernet hop.`, "neutral");
      if (!(await animatePath(arpRep1, route.phase1Reply, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const dataToRouter = createPacket("DATA", "data");
      logMessage(`[Step 3] ${src.name} sends the data frame to ${route.gateway.name}. The IP destination is still ${dst.name}.`, "success");
      if (!(await animatePath(dataToRouter, route.phase2DataToRouter, SPEED.lineDuration, "data", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const arpReq2 = createPacket("ARP", "arp");
      logMessage(`[Step 4] ${route.gateway.name} performs ARP on the destination switch side to resolve ${dst.name}.`, "neutral");
      if (!(await animatePath(arpReq2, route.phase3RequestToDst, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const arpRep2 = createPacket("ARP", "arp");
      logMessage(`[Step 5] ${dst.name} replies to ${route.gateway.name} with its MAC address.`, "neutral");
      if (!(await animatePath(arpRep2, route.phase3ReplyToRouter, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const forwardedData = createPacket("DATA", "data");
      logMessage(`[Step 6] ${route.gateway.name} forwards the packet to ${dst.name} using the destination host MAC address.`, "success");
      if (!(await animatePath(forwardedData, route.phase4ForwardedData, SPEED.lineDuration, "data", runId))) return;
    }

    if (!(await wait(SPEED.stepPause, runId))) return;

    logMessage("[Complete] Manual normal ARP communication completed.", "success");
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
    const { src, dst } = result;

    if (dst.type === "gateway") {
      const route = getGatewayAttackRoute(src);

      logMessage(`[Manual Attack] Starting ARP gateway spoofing test: ${src.name} → ${dst.name} via ${route.attackerName}`, "attack");

      if (!(await wait(SPEED.startPause, runId))) return;

      const arpReq = createPacket("ARP", "arp");
      logMessage(`[Step 1] ${src.name} sends an ARP request for gateway ${dst.name}.`, "neutral");
      if (!(await animatePath(arpReq, route.normalRequest, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const forgedReply = createPacket("FAKE", "attack");
      logMessage(`[Step 2] ${route.attackerName} sends a forged ARP reply so gateway IP ${dst.name} maps to the attacker MAC.`, "attack");
      if (!(await animatePath(forgedReply, route.forgedReply, SPEED.lineDuration, "attack", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const poisonedData = createPacket("DATA", "attack");
      logMessage(`[Step 3] ${src.name} uses the poisoned ARP entry and sends traffic to ${route.attackerName}.`, "attack");
      if (!(await animatePath(poisonedData, route.poisonedData, SPEED.lineDuration, "attack", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const attackerForward = createPacket("DATA", "data");
      logMessage(`[Step 4] ${route.attackerName} forwards the intercepted frame onward to ${dst.name}, creating a man-in-the-middle path.`, "attack");
      if (!(await animatePath(attackerForward, route.attackerForward, SPEED.lineDuration, "data", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      logMessage("[Complete] Manual gateway ARP spoofing path completed.", "attack");
    } else if (dst.type === "pc" && src.switch === dst.switch) {
      const route = getSameSwitchHostAttackRoute(src, dst);

      logMessage(`[Manual Attack] Starting same-switch ARP host spoofing test: ${src.name} → ${dst.name} via ${route.attackerName}`, "attack");

      if (!(await wait(SPEED.startPause, runId))) return;

      const arpReq = createPacket("ARP", "arp");
      logMessage(`[Step 1] ${src.name} broadcasts an ARP request asking for the MAC address of ${dst.name}.`, "neutral");
      if (!(await animatePath(arpReq, route.normalRequest, SPEED.lineDuration, "arp", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const forgedReply = createPacket("FAKE", "attack");
      logMessage(`[Step 2] ${route.attackerName} sends a forged ARP reply claiming that ${dst.name}'s IP address belongs to the attacker MAC.`, "attack");
      if (!(await animatePath(forgedReply, route.forgedReply, SPEED.lineDuration, "attack", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const poisonedData = createPacket("DATA", "attack");
      logMessage(`[Step 3] ${src.name} accepts the forged ARP mapping and sends the data frame to ${route.attackerName} instead of ${dst.name}.`, "attack");
      if (!(await animatePath(poisonedData, route.poisonedData, SPEED.lineDuration, "attack", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      const attackerForward = createPacket("DATA", "data");
      logMessage(`[Step 4] ${route.attackerName} forwards the intercepted frame to ${dst.name}, hiding the interception path from the victim.`, "attack");
      if (!(await animatePath(attackerForward, route.attackerForward, SPEED.lineDuration, "data", runId))) return;

      if (!(await wait(SPEED.stepPause, runId))) return;

      logMessage("[Complete] Manual same-switch ARP host spoofing path completed.", "attack");
    }
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
  logMessage("[System] ARP topology data loaded successfully.", "success");
});