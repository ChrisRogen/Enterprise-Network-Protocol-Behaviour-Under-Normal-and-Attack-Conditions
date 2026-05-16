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
  hq1: { bus: "hq1-bus", up: "hq1-up", attacker: "hq1-att1", routerLink: "r1-sw1", gateway: "R1-HQ" },
  hq2: { bus: "hq2-bus", up: "hq2-up", attacker: "hq2-att2", routerLink: "r1-sw2", gateway: "R1-HQ" },
  br1: { bus: "br1-bus", up: "br1-up", attacker: "br1-att1", routerLink: "r4-sw1", gateway: "R4-BR" },
  br2: { bus: "br2-bus", up: "br2-up", attacker: "br2-att2", routerLink: "r4-sw2", gateway: "R4-BR" }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  if (mode === "ok") validationStatus.classList.add("validation-ok");
  if (mode === "warn") validationStatus.classList.add("validation-warn");
}

function clearLogs() {
  packetOutput.innerHTML = "";
  logMessage("[System] Simulation reset. Waiting for new validation input...", "neutral");
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

function resetSimulation() {
  isRunning = false;
  clearPackets();
  clearLineHighlights();
  clearLogs();
  setValidationMessage('Enter source and destination IPs, then click <strong>Validate Pair</strong>.');
  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;
}

function disableControls() {
  predefinedNormalBtn.disabled = true;
  predefinedAttackBtn.disabled = true;
  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;
  validatePairBtn.disabled = true;
  resetSimulationBtn.disabled = false;
  sourceIpInput.disabled = true;
  destinationIpInput.disabled = true;
}

function enableControls() {
  predefinedNormalBtn.disabled = false;
  predefinedAttackBtn.disabled = false;
  validatePairBtn.disabled = false;
  resetSimulationBtn.disabled = false;
  sourceIpInput.disabled = false;
  destinationIpInput.disabled = false;
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

async function animateOnLine(packet, segment, duration, kind) {
  const line = document.getElementById(segment.id);
  if (!line) return;

  flashLine(segment.id, kind);
  packet.classList.add("show");

  return new Promise(resolve => {
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const point = getShellPointFromLine(line, progress, segment.reverse);
      packet.style.left = `${point.x}px`;
      packet.style.top = `${point.y}px`;

      if (progress < 1 && isRunning) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

async function animatePath(packet, segments, durationPerLine, kind, delayBetween = SPEED.lineGap) {
  for (const segment of segments) {
    if (!isRunning) return;
    await animateOnLine(packet, segment, durationPerLine, kind);
    await sleep(delayBetween);
  }
}

function getGatewayInfo(branch) {
  return branch === "HQ"
    ? { name: "R1-HQ", ip: "192.168.10.1" }
    : { name: "R4-BR", ip: "192.168.20.1" };
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

function getCrossSwitchRoute(srcNode, dstNode) {
  return {
    phase1Request: [...sourceToSwitch(srcNode), ...switchToRouter(srcNode)],
    phase1Reply: [...routerToSwitch(srcNode), ...switchToSource(srcNode)],
    phase2DataToRouter: [...sourceToSwitch(srcNode), ...switchToRouter(srcNode)],
    phase3RequestToDst: [...routerToDestination(dstNode)],
    phase3ReplyToRouter: [...destinationToRouter(dstNode)],
    phase4ForwardedData: [...routerToDestination(dstNode)],
    gateway: getGatewayInfo(srcNode.branch)
  };
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
    arpRequest: [...sourceToSwitch(srcNode), ...switchToRouter(srcNode)],
    arpReply: [...routerToSwitch(srcNode), ...switchToSource(srcNode)],
    dataFrame: [...sourceToSwitch(srcNode), ...switchToRouter(srcNode)],
    gateway: getGatewayInfo(srcNode.branch)
  };
}

function getAttackRoute(srcNode) {
  const attackerName =
    srcNode.switch === "hq1" ? "HQ-ATT-1" :
    srcNode.switch === "hq2" ? "HQ-ATT-2" :
    srcNode.switch === "br1" ? "BR-ATT-1" :
    "BR-ATT-2";

  return {
    normalRequest: [...sourceToSwitch(srcNode), ...switchToRouter(srcNode)],
    forgedReply: [...attackerToSource(srcNode)],
    poisonedData: [...sourceToAttacker(srcNode)],
    attackerForward: [...attackerToRouter(srcNode)],
    gateway: getGatewayInfo(srcNode.branch),
    attackerName
  };
}

function validatePair() {
  const sourceIp = sourceIpInput.value.trim();
  const destinationIp = destinationIpInput.value.trim();

  manualNormalBtn.disabled = true;
  manualAttackBtn.disabled = true;

  const src = NODE_MAP[sourceIp];
  const dst = NODE_MAP[destinationIp];

  if (!src || !dst) {
    setValidationMessage("Invalid source or destination IP. Use only IPs shown in the current ARP topology.", "warn");
    return null;
  }

  if (src.branch !== dst.branch) {
    setValidationMessage("ARP simulation only supports same-branch communication on this page. Cross-branch ARP pairs are not valid.", "warn");
    return null;
  }

  if (src.type !== "pc") {
    setValidationMessage("Source must be a PC host for this ARP simulation.", "warn");
    return null;
  }

  let attackAllowed = false;
  let normalAllowed = false;
  let modeText = "";

  if (dst.type === "gateway") {
    normalAllowed = true;
    attackAllowed = true;
    modeText = `Valid PC-to-gateway ARP path detected: <strong>${src.name} → ${dst.name}</strong>. Normal and attack tests are available.`;
  } else if (dst.type === "pc") {
    normalAllowed = true;
    if (src.switch === dst.switch) {
      modeText = `Valid same-switch ARP path detected: <strong>${src.name} → ${dst.name}</strong>. Normal test is available.`;
    } else {
      modeText = `Valid cross-switch same-branch ARP path detected: <strong>${src.name} → ${dst.name}</strong>. Normal test is available.`;
    }
  }

  manualNormalBtn.disabled = !normalAllowed;
  manualAttackBtn.disabled = !attackAllowed;

  setValidationMessage(modeText, "ok");
  return { src, dst, normalAllowed, attackAllowed };
}

async function runPredefinedNormalDemo() {
  if (isRunning) return;
  isRunning = true;
  disableControls();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  const src = NODE_MAP["192.168.20.101"];
  const dst = NODE_MAP["192.168.20.103"];
  const route = getCrossSwitchRoute(src, dst);

  logMessage("[Normal Demo] Starting cross-switch BR LAN communication: BR-PC1 → BR-PC3", "success");
  await sleep(SPEED.startPause);

  const arpReq1 = createPacket("ARP", "arp");
  logMessage("[Step 1] BR-PC1 checks ARP cache for the next-hop path and sends an ARP request toward R4-BR.", "neutral");
  await animatePath(arpReq1, route.phase1Request, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const arpRep1 = createPacket("ARP", "arp");
  logMessage("[Step 2] R4-BR replies with its MAC address so BR-PC1 can build the correct ARP mapping.", "neutral");
  await animatePath(arpRep1, route.phase1Reply, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const dataToRouter = createPacket("DATA", "data");
  logMessage("[Step 3] BR-PC1 sends the data frame toward R4-BR. IP destination remains BR-PC3, but MAC destination is R4-BR.", "success");
  await animatePath(dataToRouter, route.phase2DataToRouter, SPEED.lineDuration, "data");
  await sleep(SPEED.stepPause);

  const arpReq2 = createPacket("ARP", "arp");
  logMessage("[Step 4] R4-BR now needs BR-PC3 MAC, so it performs ARP on the SW-BR-2 side.", "neutral");
  await animatePath(arpReq2, route.phase3RequestToDst, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const arpRep2 = createPacket("ARP", "arp");
  logMessage("[Step 5] BR-PC3 replies with its MAC address to R4-BR.", "neutral");
  await animatePath(arpRep2, route.phase3ReplyToRouter, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const forwardedData = createPacket("DATA", "data");
  logMessage("[Step 6] R4-BR forwards the packet to BR-PC3. IP addresses stay end-to-end, while the destination MAC is updated to BR-PC3.", "success");
  await animatePath(forwardedData, route.phase4ForwardedData, SPEED.lineDuration, "data");
  await sleep(SPEED.stepPause);

  logMessage("[Complete] Normal cross-switch communication completed successfully.", "success");

  isRunning = false;
  enableControls();
}

async function runPredefinedAttackDemo() {
  if (isRunning) return;
  isRunning = true;
  disableControls();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  const src = NODE_MAP["192.168.10.101"];
  const route = getAttackRoute(src);

  logMessage("[Attack Demo] Starting HQ ARP spoofing path: HQ-PC1 → R1-HQ through HQ-ATT-1", "attack");
  await sleep(SPEED.startPause);

  const arpReq = createPacket("ARP", "arp");
  logMessage("[Step 1] HQ-PC1 sends a normal ARP request to resolve the MAC address of the HQ gateway R1-HQ.", "neutral");
  await animatePath(arpReq, route.normalRequest, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const forgedReply = createPacket("FAKE", "attack");
  logMessage("[Step 2] HQ-ATT-1 sends a forged ARP reply, claiming that the gateway IP address belongs to the attacker MAC.", "attack");
  await animatePath(forgedReply, route.forgedReply, SPEED.lineDuration, "attack");
  await sleep(SPEED.stepPause);

  const poisonedData = createPacket("DATA", "attack");
  logMessage("[Step 3] HQ-PC1 updates its ARP cache incorrectly and sends traffic to HQ-ATT-1 instead of directly to R1-HQ.", "attack");
  await animatePath(poisonedData, route.poisonedData, SPEED.lineDuration, "attack");
  await sleep(SPEED.stepPause);

  const attackerForward = createPacket("DATA", "data");
  logMessage("[Step 4] HQ-ATT-1 forwards the intercepted traffic onward to R1-HQ, demonstrating a man-in-the-middle path.", "attack");
  await animatePath(attackerForward, route.attackerForward, SPEED.lineDuration, "data");
  await sleep(SPEED.stepPause);

  logMessage("[Complete] HQ attack behaviour completed. Traffic was redirected through the attacker by ARP poisoning.", "attack");

  isRunning = false;
  enableControls();
}

async function runManualNormal() {
  const result = validatePair();
  if (!result || !result.normalAllowed || isRunning) return;

  const { src, dst } = result;
  isRunning = true;
  disableControls();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  logMessage(`[Manual Normal] Starting normal ARP communication: ${src.name} → ${dst.name}`, "success");
  await sleep(SPEED.startPause);

  if (dst.type === "gateway") {
    const route = getGatewayRoute(src);

    const arpReq = createPacket("ARP", "arp");
    logMessage(`[Step 1] ${src.name} sends ARP request for ${dst.name}.`, "neutral");
    await animatePath(arpReq, route.arpRequest, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const arpRep = createPacket("ARP", "arp");
    logMessage(`[Step 2] ${dst.name} replies with its MAC address.`, "neutral");
    await animatePath(arpRep, route.arpReply, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const dataPkt = createPacket("DATA", "data");
    logMessage(`[Step 3] ${src.name} sends the data frame toward ${dst.name}.`, "success");
    await animatePath(dataPkt, route.dataFrame, SPEED.lineDuration, "data");
  } else if (src.switch === dst.switch) {
    const route = getSameSwitchRoute(src, dst);

    const arpReq = createPacket("ARP", "arp");
    logMessage(`[Step 1] ${src.name} sends ARP request for ${dst.name} on the same switch.`, "neutral");
    await animatePath(arpReq, route.arpRequest, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const arpRep = createPacket("ARP", "arp");
    logMessage(`[Step 2] ${dst.name} replies with its MAC address.`, "neutral");
    await animatePath(arpRep, route.arpReply, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const dataPkt = createPacket("DATA", "data");
    logMessage(`[Step 3] ${src.name} sends the data frame directly across the same switch bus.`, "success");
    await animatePath(dataPkt, route.dataFrame, SPEED.lineDuration, "data");
  } else {
    const route = getCrossSwitchRoute(src, dst);

    const arpReq1 = createPacket("ARP", "arp");
    logMessage(`[Step 1] ${src.name} sends ARP request toward the branch gateway ${route.gateway.name}.`, "neutral");
    await animatePath(arpReq1, route.phase1Request, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const arpRep1 = createPacket("ARP", "arp");
    logMessage(`[Step 2] ${route.gateway.name} replies with its MAC address.`, "neutral");
    await animatePath(arpRep1, route.phase1Reply, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const dataToRouter = createPacket("DATA", "data");
    logMessage(`[Step 3] ${src.name} sends the frame to ${route.gateway.name}.`, "success");
    await animatePath(dataToRouter, route.phase2DataToRouter, SPEED.lineDuration, "data");
    await sleep(SPEED.stepPause);

    const arpReq2 = createPacket("ARP", "arp");
    logMessage(`[Step 4] ${route.gateway.name} performs ARP on the destination switch side for ${dst.name}.`, "neutral");
    await animatePath(arpReq2, route.phase3RequestToDst, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const arpRep2 = createPacket("ARP", "arp");
    logMessage(`[Step 5] ${dst.name} replies to ${route.gateway.name} with its MAC address.`, "neutral");
    await animatePath(arpRep2, route.phase3ReplyToRouter, SPEED.lineDuration, "arp");
    await sleep(SPEED.stepPause);

    const forwardedData = createPacket("DATA", "data");
    logMessage(`[Step 6] ${route.gateway.name} forwards the packet to ${dst.name}.`, "success");
    await animatePath(forwardedData, route.phase4ForwardedData, SPEED.lineDuration, "data");
  }

  await sleep(SPEED.stepPause);
  logMessage("[Complete] Manual normal communication completed.", "success");

  isRunning = false;
  enableControls();
}

async function runManualAttack() {
  const result = validatePair();
  if (!result || !result.attackAllowed || isRunning) return;

  const { src } = result;
  const route = getAttackRoute(src);

  isRunning = true;
  disableControls();
  clearPackets();
  clearLineHighlights();
  clearLogs();

  logMessage(`[Manual Attack] Starting HQ/BR ARP spoofing test: ${src.name} → ${route.gateway.name} via ${route.attackerName}`, "attack");
  await sleep(SPEED.startPause);

  const arpReq = createPacket("ARP", "arp");
  logMessage(`[Step 1] ${src.name} issues an ARP request for the gateway ${route.gateway.name}.`, "neutral");
  await animatePath(arpReq, route.normalRequest, SPEED.lineDuration, "arp");
  await sleep(SPEED.stepPause);

  const forgedReply = createPacket("FAKE", "attack");
  logMessage(`[Step 2] ${route.attackerName} sends a forged ARP reply so the gateway IP maps to the attacker MAC.`, "attack");
  await animatePath(forgedReply, route.forgedReply, SPEED.lineDuration, "attack");
  await sleep(SPEED.stepPause);

  const poisonedData = createPacket("DATA", "attack");
  logMessage(`[Step 3] ${src.name} now sends data toward ${route.attackerName} because the ARP cache is poisoned.`, "attack");
  await animatePath(poisonedData, route.poisonedData, SPEED.lineDuration, "attack");
  await sleep(SPEED.stepPause);

  const attackerForward = createPacket("DATA", "data");
  logMessage(`[Step 4] ${route.attackerName} forwards the frame onward to ${route.gateway.name}.`, "attack");
  await animatePath(attackerForward, route.attackerForward, SPEED.lineDuration, "data");
  await sleep(SPEED.stepPause);

  logMessage("[Complete] Manual ARP spoofing path completed.", "attack");

  isRunning = false;
  enableControls();
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
  logMessage("[System] Topology data loaded successfully.", "success");
});