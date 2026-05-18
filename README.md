# Enterprise Network Protocol Behaviour Under Normal and Attack Conditions

## Project Title

**Interactive Enterprise Network Protocol Simulator**

## Project Overview

This project is an interactive cybersecurity learning and demonstration platform developed for the **SIT716 Computer Networks and Security HD Plus Project**. The project demonstrates how key enterprise network protocols behave under both **normal** and **attack/abnormal** conditions.

The completed project focuses on three core protocols:

- **ARP** — Address Resolution Protocol
- **DHCP** — Dynamic Host Configuration Protocol
- **DNS** — Domain Name System

The main purpose of this project is to make protocol behaviour easier to understand for both technical and non-technical users. Instead of explaining protocol attacks only through theory, command output, or packet tables, this project uses animated website simulations, real-time event logs, Ubuntu practical demonstrations, and Wireshark packet evidence.

The project connects three layers:

1. **Website simulation layer** — visual protocol animation and user interaction.
2. **Ubuntu MiniEdit/Mininet practical lab layer** — practical recreation of protocol behaviour.
3. **Wireshark packet evidence layer** — packet-level validation using captured traffic.

---

## Project Aim

The aim of this project is to demonstrate advanced understanding of network protocol behaviour by showing:

- how ARP, DHCP, and DNS operate under normal conditions;
- how the same protocols can be abused in attack scenarios;
- how packet movement can be explained visually using an interactive website;
- how practical protocol behaviour can be recreated using Ubuntu, MiniEdit/Mininet, and Wireshark;
- how packet-level evidence can validate the website simulation; and
- how another user can reproduce the work using OVA files, PCAP files, and instruction manuals.

---

## Completed Scope

The completed validated scope includes:

- Interactive home page explaining the project purpose.
- ARP simulation page.
- DHCP simulation page.
- DNS simulation page.
- OSPF future work section.
- Normal and attack simulation logic for ARP, DHCP, and DNS.
- Manual input validation for supported and unsupported paths.
- Reset and re-test functionality.
- Real-time event output logs.
- Wireshark evidence sections.
- Practical recreation instruction manuals.
- GitHub repository structure for website code and documentation.
- Google Drive artefact access for large OVA and PCAP files.
- Ubuntu practical demo videos for ARP, DHCP, and DNS.

---

## Why This Project Was Created

Network protocols are often difficult to understand when they are explained only through technical definitions or packet capture tables. This project was created to make those behaviours easier to understand through visual packet movement and simple event explanations.

The simulator is designed so that even a non-technical user can see:

- what happens during normal ARP, DHCP, and DNS operation;
- what changes when an attacker abuses the protocol;
- which devices are involved in the communication;
- how packets move through the topology;
- why invalid paths are blocked; and
- how Wireshark evidence proves the behaviour.

The animations are intentionally designed to run slowly during normal use so that a new user can clearly observe each protocol step. For the final video presentation, the simulation speed can be increased to fit within the required demonstration time.

---

## Protocols Implemented

### 1. ARP — Address Resolution Protocol

ARP is used to map an IPv4 address to a MAC address inside a local network.

#### Normal Behaviour

In normal ARP operation:

1. A host wants to communicate with another local device or gateway.
2. The host checks its ARP cache.
3. If no entry exists, the host broadcasts an ARP request.
4. The legitimate destination replies with its MAC address.
5. The sender stores the IP-to-MAC mapping and sends traffic normally.

#### Attack Behaviour

In the ARP spoofing attack:

1. The attacker sends a forged ARP reply.
2. The victim accepts the false IP-to-MAC mapping.
3. Traffic that should go to a legitimate host or gateway may be redirected through the attacker.
4. This can support man-in-the-middle activity, traffic observation, manipulation, or denial of service.

#### ARP Features Implemented

- Normal ARP request and reply simulation.
- ARP spoofing / forged ARP reply simulation.
- Manual validation of valid and invalid ARP paths.
- Gateway spoofing examples.
- Same-switch host spoofing examples.
- Normal-only cross-switch same-branch examples.
- Invalid wrong-branch path blocking.
- Wireshark evidence for:
  - normal ARP request;
  - legitimate ARP reply;
  - spoofed ARP reply; and
  - poisoned traffic impact.

---

### 2. DHCP — Dynamic Host Configuration Protocol

DHCP automatically provides clients with network configuration such as IP address, default gateway, DNS server, and lease information.

#### Normal Behaviour

Normal DHCP follows the DORA sequence:

1. **Discover** — client broadcasts a request for DHCP service.
2. **Offer** — legitimate DHCP server offers configuration.
3. **Request** — client requests the offered configuration.
4. **ACK** — DHCP server confirms the lease.

#### Attack Behaviour

In a rogue DHCP attack:

1. A malicious or unauthorised DHCP server is placed in the network.
2. The client broadcasts a DHCP Discover message.
3. The rogue DHCP server sends a competing Offer.
4. If the client accepts the rogue offer, it may receive malicious network configuration.
5. This can redirect traffic, assign a wrong gateway, assign a hostile DNS server, or disrupt communication.

#### DHCP Features Implemented

- Normal DHCP DORA simulation.
- Rogue DHCP attack simulation.
- Manual validation of client-to-DHCP-server pairings.
- Correct branch DHCP validation.
- Wrong-branch DHCP blocking.
- Invalid source type blocking.
- Wireshark evidence for:
  - legitimate DHCP offer; and
  - rogue DHCP offer.

---

### 3. DNS — Domain Name System

DNS resolves domain names into IP addresses.

#### Normal Behaviour

In normal DNS operation:

1. A client sends a DNS query to a trusted DNS server.
2. The DNS server returns the correct IP address.
3. The client connects to the legitimate destination.

#### Attack Behaviour

In rogue DNS response behaviour:

1. A rogue DNS responder or attacker provides a forged answer.
2. The client may accept the fake IP address.
3. The user may be redirected to an attacker-controlled destination.
4. This can support phishing, malware delivery, credential theft, or traffic interception.

#### DNS Features Implemented

- Normal DNS query and response simulation.
- Rogue DNS response simulation.
- Manual validation of client-to-DNS-server pairings.
- Correct branch DNS validation.
- Wrong-branch DNS blocking.
- Invalid source type blocking.
- Wireshark evidence for:
  - legitimate DNS query;
  - legitimate DNS response; and
  - rogue/abnormal DNS query-response behaviour.

---

## OSPF Future Work

OSPF is included as a planned future extension.

The current completed and validated project scope is ARP, DHCP, and DNS. OSPF was left as future work because it requires additional routing-specific implementation and validation.

Planned OSPF features include:

- OSPF neighbour formation.
- Hello packet exchange.
- Route advertisement.
- Best path selection.
- Link failure behaviour.
- Route recalculation.
- Abnormal routing behaviour.
- Possible routing attack demonstration.
- Wireshark validation of OSPF packet behaviour.

---

## Website Features

The website includes:

- Professional dark cybersecurity-themed interface.
- Home page project overview.
- Protocol-specific pages for ARP, DHCP, and DNS.
- Enterprise-style topology with:
  - routers;
  - switches;
  - client PCs;
  - attacker PCs;
  - DHCP server;
  - DNS server;
  - application server; and
  - WAN cloud.
- Predefined normal simulation buttons.
- Predefined attack simulation buttons.
- Manual source/destination input testing.
- Validation logic to enable or disable simulation buttons.
- Real-time event logs.
- Reset functionality.
- Protocol explanation sections.
- Wireshark evidence sections.
- Reproduction package sections.
- Links to instruction manuals and external artefact folders.

---

## Manual Input Validation

A key feature of the simulator is manual input validation.

The simulator does not allow every random source and destination combination. Instead, it checks whether the selected path is technically meaningful for the protocol.

Examples:

- ARP blocks wrong-branch paths because ARP does not resolve across routed networks.
- DHCP blocks clients that are paired with the wrong branch DHCP server.
- DNS blocks clients that are paired with the wrong branch DNS server.
- Invalid source types, same-device paths, and unmapped IP addresses are rejected.
- Simulation buttons remain disabled until a valid path is selected.

This validation makes the simulator protocol-aware rather than a simple animation tool.

---

## Project Structure

The repository is organised as follows:

```text
Enterprise-Network-Protocol-Behaviour-Under-Normal-and-Attack-Conditions/
│
├── README.md
│
└── Enterprise Network Protocol Behaviour Under Normal and Attack Conditions/
    │
    ├── project-notes/
    │   ├── git-notes.md
    │   ├── project-plan.md
    │   └── topology-plan.md
    │
    └── website/
        │
        ├── index.html
        ├── arp.html
        ├── dhcp.html
        ├── dns.html
        ├── ospf.html
        │
        ├── style.css
        ├── arp.js
        ├── dhcp.js
        ├── dns.js
        │
        ├── assets/
        │   ├── icons/
        │   ├── images/
        │   └── docs/
        │
        ├── data/
        │
        └── docs/
            ├── arp-practical-recreation-instruction-manual.pdf
            ├── dhcp-practical-recreation-instruction-manual.pdf
            ├── dns-practical-recreation-instruction-manual.pdf
            ├── checkin-notes.md
            ├── screenshot-log.md
            └── test-notes.md
