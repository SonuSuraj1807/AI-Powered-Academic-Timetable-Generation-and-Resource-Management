# VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY
**(A UGC Autonomous Institution, Approved by AICTE, Accredited by NBA & NAAC - A Grade, Affiliated to JNTUH)**

### DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING (Data Science)

---

## Proposed System: AI-Powered Academic Timetable Generation and Resource Management System

---

## SLIDE 1 — Title Slide

**Counselling Code:** VBIT  
**Department:** Department of Computer Science and Engineering (Data Science)  
**Project Title:** AI-Powered Academic Timetable Generation and Resource Management System  
**Domain:** Artificial Intelligence / Operations Research & Data Science  

```
______________________          ______________________          ______________________
       Student                          Guide                        Coordinator
```

---

## SLIDE 2 — 1. Introduction

### Background & Context
Academic scheduling in autonomous institutions like VBIT (CSE – Data Science) involves solving complex combinatorial optimization problems spanning multiple regulations (R25, R22), section allocations, lab infrastructure, faculty workloads, and examination logistics.

Manual timetable and exam schedule generation typically consumes 2–3 weeks of departmental effort and remains highly prone to critical errors — faculty double-booking, room collisions, student exam clashes for backlog/elective enrollments, and unfair seating arrangements enabling exam malpractice.

### The Core Problem
- **Combinatorial Explosion:** Scheduling *N* subjects across *M* faculty, *R* classrooms/labs, and *T* time slots yields millions of possible configurations.
- **Exam Collisions:** Students enrolled in overlapping courses (backlogs, electives) frequently face conflicting exam time slots — an NP-hard graph coloring problem.
- **Exam Malpractice Risk:** Same-branch students seated adjacently in exam halls significantly increases copying risk.
- **Faculty Unavailability:** Emergency faculty absence disrupts regular schedules without an intelligent automated replacement mechanism.

### Proposed Solution
An **AI-Powered Decision Support System** utilizing:
- **Constraint Satisfaction Problem (CSP)** solvers with MRV heuristics for class timetabling
- **DSatur (Degree of Saturation) Graph Coloring** algorithm for conflict-free exam scheduling
- **Column-Interleaved Anti-Malpractice Seating** algorithms for exam hall allocation
- **Smart Swap Weighted Scoring Engine** for faculty substitution
- **Cloud-Native Firebase Infrastructure** for real-time data synchronization and RBAC

---

## SLIDE 3 — 2. Objective/s

### Primary Objective
To design and deploy an automated, web-based AI system that generates 100% clash-free academic timetables, optimized examination schedules, anti-malpractice seating arrangements, and dynamic faculty substitutions for Vignana Bharathi Institute of Technology.

### Specific Sub-Objectives

1. **Hard Constraint Enforcement:** Guarantee zero hard-constraint violations — no faculty/room double-booking, mandatory continuous lab blocks (2 periods R25 / 3 periods R22), and strict weekly credit fulfillment.
2. **Soft Constraint Optimization:** Minimize subject repetition on the same day, balance weekly faculty workload, and optimize period gap distribution.
3. **Graph-Colored Exam Scheduling:** Implement the **DSatur (Degree of Saturation)** algorithm to model exam scheduling as a graph coloring problem — eliminating subject conflicts for regular and backlog students using minimum chromatic time slots.
4. **Room-Capacity Greedy Assignment:** Automatically assign examination halls to time slots using a greedy best-fit algorithm based on enrollment count and room capacity.
5. **Anti-Malpractice Seating Allocation:** Generate **column-interleaved matrix seating charts** — alternating different branches across adjacent columns (Branch A → Columns 0, 2; Branch B → Columns 1, 3) to prevent same-branch adjacency.
6. **Automated Invigilation Assignment:** Dynamically assign invigilators with round-robin workload balancing — 1 invigilator for single-branch rooms, 2 for multi-branch rooms, with no faculty double-booking per session.
7. **Smart Faculty Substitution:** Automatically evaluate faculty free slots, subject domain expertise, and weekly load to recommend optimal replacement candidates during leave.
8. **Dynamic Placement Overrides:** Facilitate training drive slot overrides with automatic redistribution of displaced classes to remaining open slots.
9. **Automated Export & Reporting:** Provide styled multi-tab Excel workbooks (`.xlsx`) and branded PDF schedules (`.pdf`) for departmental record-keeping.

---

## SLIDE 4 — 3. Description of the Proposed System

### System Overview
The proposed system is an enterprise-grade academic management platform built with React 19, Zustand state management, and Firebase Cloud Firestore. It combines modern UI aesthetics with core Data Science algorithmic techniques to solve three distinct NP-hard scheduling and allocation problems.

### Core Architectural Capabilities

| Capability | Engine | Algorithm |
|---|---|---|
| **Class Timetable Generation** | TimetableEngine.js | CSP Backtracking + MRV Heuristic |
| **Exam Schedule Generation** | ExamScheduler.js | DSatur Graph Coloring (+ Welsh-Powell fallback) |
| **Exam Seating Allocation** | SeatingAllocationEngine.js | Column-Interleaved Matrix Algorithm |
| **Faculty Substitution** | SmartSwapEngine.js | Multi-Factor Weighted Scoring |
| **Training Day Overrides** | TrainingOverrideResolver.js | Greedy Redistribution |
| **Excel Export** | excelExporter.js | ExcelJS Multi-Tab Workbooks |
| **PDF Export** | pdfExporter.js + examSeatingPdfExporter.js | jsPDF + AutoTable |

### Role-Based Access Control (RBAC)
- **Admin / Academic Coordinator Portal:** Full access to timetable generation, exam scheduling, seating allocation, curriculum registry, and faculty management.
- **Faculty Portal:** Personal timetable view, substitution requests, and invigilation duties.
- **Student Portal:** Personal class schedule, exam timetable, and seating hall lookup.

---

## SLIDE 5 — 4. Modules of the System

### Module 1: User Authentication & Role Management (RBAC)
Manages multi-role authorization (Admin, Faculty, Student) secured via Firebase Authentication (Email/Password) and Firestore Security Rules.

### Module 2: Curriculum & Resource Registry Engine
Stores regulation-wise subjects (R25/R22), credit rules, lab requirements, classroom capacity metrics (rows × columns), and faculty availability maps.

### Module 3: AI Timetable Constraint Solver
Executes a greedy backtracking search with MRV heuristic ordering to assign subjects, rooms, and teachers to weekly time slots. Enforces:
- 2-period (R25) / 3-period (R22) continuous lab blocks
- No faculty/room double-booking across sections
- Elective alignment across sections of the same year
- Co-curricular subject placement rules (Tutorial, Sports, Mentoring, Library, NPTEL)
- Staggered lunch enforcement and maximum 2 same-subject slots per day

### Module 4: Exam Scheduling — DSatur Graph Coloring
Models the exam scheduling problem as a **Graph Coloring Problem**:
- **Vertices** = Exams (courses)
- **Edges** = Conflicts (shared enrolled students between two courses)
- **Colors** = Time Slots

**DSatur Algorithm Steps:**
1. Build a conflict graph from student enrollment data (adjacency list)
2. Initialize saturation degree = 0 for all vertices
3. Select uncolored vertex with **highest saturation degree** (ties broken by highest degree)
4. Assign the **lowest available color** not used by any neighbor
5. Update saturation degrees of all uncolored neighbors
6. Repeat until all vertices are colored

**Output:** Minimum number of time slots (chromatic number) such that **no student has two exams in the same slot**.

**Fallback:** Welsh-Powell algorithm (greedy by degree-descending ordering) if DSatur produces empty results.

**Room Assignment:** After graph coloring, exams in each time slot are assigned to rooms using a **greedy capacity-first algorithm** — rooms sorted by capacity descending, exams sorted by enrollment descending, matched via first-fit.

### Module 5: Anti-Malpractice Seating Allocation Engine
Generates **column-interleaved exam seating plans** using a 4-column × 6-row room grid model:

**Interleaving Algorithm:**
1. Group students by branch, sort each group by hall ticket number ascending
2. Sort branches by student count descending and create branch pairs
3. For each paired room: Branch A → even columns (0, 2), Branch B → odd columns (1, 3)
4. Fill each column top-to-bottom with sorted roll numbers
5. Seal room when grid is full; open next room
6. Leftover single-branch students fill rooms without interleaving

**Validation Checks:**
- ✅ Adjacent columns must have different branches (anti-malpractice)
- ✅ Roll numbers ascending within each column
- ✅ No duplicate student seating across rooms
- ✅ Invigilator count matches branch diversity (1 for single-branch, 2 for multi-branch)
- ✅ No faculty double-booking in same FN/AN session

**Dynamic Invigilation:**
- Round-robin workload balancing across sessions
- Faculty unavailability exclusion list support
- Cross-session duty tracking

### Module 6: Smart Faculty Substitution & Training Override
- **Smart Swap Engine:** Real-time leave request handling. Evaluates substitute candidates using a multi-factor weighted scoring equation:
  - Subject Expertise Match: +30 points
  - Same Department Bonus: +10 points
  - Base Availability: +5 points
  - Near Max Workload Penalty: -10 points
  - At Max Workload Penalty: -50 points
- **Training Override Resolver:** When placement/training drives block multiple days, the engine collects displaced classes and redistributes them to remaining open slots, respecting lab continuity and subject frequency limits.

### Module 7: Analytics, Notifications & Document Export
- Visual charts for room utilization and weekly faculty load
- Real-time notification streams via Firestore `onSnapshot` listeners
- 1-click styled PDF/Excel downloads:
  - Multi-tab Excel workbooks with cell fills, borders, and auto-widths (ExcelJS)
  - Branded vector PDF schedules with institutional headers (jsPDF + AutoTable)
  - Room-wise exam seating PDFs with grid layouts and invigilator info

---

## SLIDE 6 — 5. System Architecture / Workflow / Flow Diagram

### Three-Tier System Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          PRESENTATION LAYER (UI)                            ║
║                                                                             ║
║   React 19  •  Zustand State  •  Custom CSS Design System  •  Lucide Icons  ║
║                                                                             ║
║   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             ║
║   │ Admin Dashboard  │  │Faculty Dashboard│  │Student Dashboard│             ║
║   │ • Timetable Gen  │  │ • My Schedule   │  │ • My Timetable  │             ║
║   │ • Exam Scheduler │  │ • Substitutions │  │ • Exam Schedule │             ║
║   │ • Seating Plans  │  │ • Invigilation  │  │ • Seating Lookup│             ║
║   │ • Faculty Mgmt   │  │ • Notifications │  │ • Notifications │             ║
║   │ • Curriculum Reg  │  │                 │  │                 │             ║
║   │ • Reports/Export │  │                 │  │                 │             ║
║   └─────────────────┘  └─────────────────┘  └─────────────────┘             ║
╚═══════════════════════════════╤═══════════════════════════════════════════════╝
                                │
                                ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    APPLICATION / ALGORITHM LAYER                            ║
║                                                                             ║
║   ┌───────────────────────┐  ┌───────────────────────┐                      ║
║   │  CSP Timetable Solver │  │  DSatur Exam Scheduler │                     ║
║   │  (Backtracking + MRV) │  │  (Graph Coloring)      │                     ║
║   │  TimetableEngine.js   │  │  ExamScheduler.js       │                    ║
║   └───────────────────────┘  └───────────────────────┘                      ║
║                                                                             ║
║   ┌───────────────────────┐  ┌───────────────────────┐                      ║
║   │  Seating Matrix Alloc │  │  Smart Swap Engine     │                     ║
║   │  (Column Interleaving)│  │  (Weighted Scoring)    │                     ║
║   │  SeatingAllocation.js │  │  SmartSwapEngine.js    │                     ║
║   └───────────────────────┘  └───────────────────────┘                      ║
║                                                                             ║
║   ┌───────────────────────┐  ┌───────────────────────┐                      ║
║   │ Training Override Res │  │ Excel & PDF Export     │                     ║
║   │ TrainingOverride.js   │  │ excelExporter.js       │                    ║
║   │ (Class Redistribution)│  │ pdfExporter.js         │                    ║
║   └───────────────────────┘  └───────────────────────┘                      ║
╚═══════════════════════════════╤═══════════════════════════════════════════════╝
                                │
                                ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║                       DATA & SERVICE LAYER                                  ║
║                                                                             ║
║   Firebase Auth (RBAC)  •  Cloud Firestore DB  •  Zustand Global Store      ║
║                                                                             ║
║   Collections:                                                              ║
║   /users  •  /timetables  •  /exams  •  /rooms  •  /curriculum              ║
║   /substitutions  •  /notifications  •  /examSeatingPlans                   ║
║                                                                             ║
║   Firestore Security Rules  •  Real-time onSnapshot Listeners               ║
║   Biometric/RFID Integration Service (Mock Gateway)                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Timetable Generation Workflow

```
[Admin Triggers Timetable Generation]
              │
              ▼
[Fetch Curriculum, Rooms, Faculty Availability from Cloud Firestore]
              │
              ▼
[Build CSP Variables: (Subject, Section, Room, Faculty, TimeSlot)]
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Step 1: Place Lab Sessions (Most Constrained)    │
│   → 2-period (R25) or 3-period (R22) blocks     │
│   → Check faculty + lab room availability        │
│   → No two labs per section per day              │
├─────────────────────────────────────────────────┤
│ Step 2: Place Electives (Aligned Across Sections)│
│   → Match PE group slots from existing schedules │
├─────────────────────────────────────────────────┤
│ Step 3: Distribute Theory Subjects               │
│   → Target ≤5 hours/week per subject             │
│   → No consecutive same-subject periods          │
│   → Faculty double-booking validation            │
├─────────────────────────────────────────────────┤
│ Step 4: Fill Remaining Slots                     │
│   → Co-curricular subjects (once per week)       │
│   → Balance subject frequency across days        │
└─────────────────────────────────────────────────┘
              │
              ▼
[Store in Firestore DB → Notify Faculty/Students via Real-Time Stream]
              │
              ▼
[Generate Styled Excel (.xlsx) & PDF Reports] → [Done]
```

### Exam Scheduling Workflow (DSatur Graph Coloring)

```
[Admin Inputs Exam List with Student Enrollment Data]
              │
              ▼
[Build Conflict Graph]
  • Vertex = Each Exam
  • Edge = Shared enrolled students between two exams
              │
              ▼
[Apply DSatur Algorithm]
  • Initialize saturation[v] = 0 for all vertices
  • LOOP:
  │   Select uncolored vertex with HIGHEST saturation degree
  │   (ties → highest graph degree)
  │   Assign LOWEST available color not used by neighbors
  │   Update saturation of uncolored neighbors
  │   UNTIL all vertices colored
              │
              ▼
[Color Index = Time Slot Assignment]
  • Total Colors Used = Minimum Exam Days Required
              │
              ▼
[Greedy Room Assignment per Time Slot]
  • Sort rooms by capacity DESC, exams by enrollment DESC
  • First-fit room allocation with utilization tracking
              │
              ▼
[Verification: No student has overlapping exams in same slot]
              │
              ▼
[Output: Exam Schedule + Room Assignments + Conflict Summary]
```

### Exam Seating Allocation Workflow

```
[Admin Configures Session: Date, FN/AN, Exam Block, Student CSV Upload]
              │
              ▼
[Parse CSV → Group Students by Branch → Sort by Hall Ticket ASC]
              │
              ▼
[Pair Branches by Size (Largest First)]
  • Branch A → Even Columns (0, 2)
  • Branch B → Odd Columns (1, 3)
              │
              ▼
[Fill Room Grids: 4 Columns × 6 Rows = 24 Seats/Room]
  • Top-to-bottom per column
  • Seal room when full → Open next room
              │
              ▼
[Assign Invigilators]
  • 1 invigilator (single-branch room)
  • 2 invigilators (multi-branch room)
  • Round-robin workload balancing
  • No faculty double-booking per session
              │
              ▼
[Validate Plan]
  • Adjacent column branch mismatch ✓
  • Roll number ascending order ✓
  • No duplicate student seating ✓
  • Invigilator count correctness ✓
              │
              ▼
[Export: Room-wise Seating PDFs + Invigilator Duty Sheets]
```

---

## SLIDE 7 — 6. Technologies Used

### Frontend Technology Stack
| Technology | Purpose |
|---|---|
| React 19 (Vite Build) | Component-based UI framework |
| React Router DOM v7 | Client-side routing & navigation |
| Zustand 5.0 | Lightweight global state management |
| Custom Vanilla CSS | Design system with CSS custom properties |
| Lucide React | Modern SVG icon library |

### Backend & Cloud Database
| Technology | Purpose |
|---|---|
| Firebase Authentication | Email/Password login with role-based claims |
| Google Cloud Firestore | NoSQL real-time database with security rules |
| Firebase Cloud Functions | Serverless backend for notifications (optional) |

### Algorithms & Data Science Techniques
| Algorithm | Use Case | Complexity |
|---|---|---|
| CSP Backtracking + Forward Checking | Class timetable generation | NP-complete |
| Minimum Remaining Values (MRV) Heuristic | CSP variable ordering optimization | Heuristic |
| DSatur (Degree of Saturation) | Exam schedule graph coloring | O(V²) |
| Welsh-Powell Greedy Coloring | Fallback exam scheduling | O(V² + E) |
| Column-Interleaved Matrix Allocation | Anti-malpractice seating | O(S × R) |
| Multi-Factor Weighted Decision Matrix | Faculty substitution scoring | O(F × S) |
| Greedy Redistribution | Training day class displacement | O(D × P) |

### Export & Formatting Libraries
| Library | Purpose |
|---|---|
| ExcelJS | Multi-tab formatted spreadsheets with cell fills, borders, auto-widths |
| jsPDF | Vector PDF generation with institutional headers |
| jsPDF-AutoTable | Tabular PDF layouts for timetables and seating plans |
| FileSaver.js | Client-side file download triggering |

---

## SLIDE 8 — 7. Merits of the Proposed System

1. **Zero Schedule Clashes:** Eliminates 100% of hard-constraint conflicts — no faculty or classroom double-booking, no student exam overlaps.
2. **Exponential Time Savings:** Reduces scheduling generation time from 2–3 weeks (manual) to under 5 seconds (automated).
3. **Graph-Theoretic Exam Optimization:** DSatur algorithm solves exam scheduling as a minimum chromatic coloring problem, guaranteeing no backlog/elective student has overlapping exams.
4. **Automated Anti-Malpractice Seating:** Column-interleaved algorithm ensures no two adjacent seats have the same branch — validated against 5 constraint checks.
5. **Intelligent Invigilation Management:** Auto-assigns invigilators with round-robin workload balancing, adjustable unavailability lists, and session-wise duty tracking.
6. **Instant Faculty Absence Resolution:** Smart Swap Engine evaluates subject expertise (+30), department match (+10), and workload balance to instantly rank substitute candidates.
7. **High Adaptability:** Accommodates mid-semester curriculum revisions, placement drive overrides (with automatic class redistribution), and lab changes without manual rework.
8. **Institutional Ready Reports:** Produces ready-to-print, formatted multi-tab Excel spreadsheets and branded vector PDF documents with a single click.
9. **Regulation Flexibility:** Supports multiple regulation frameworks (R25, R22) with distinct lab duration rules, lunch slot configurations, and co-curricular policies.

---

## SLIDE 9 — 8. Expected Outcomes

- **Fully Functional Web Portal:** A deployed, high-performance web platform tailored for VBIT CSE-DS department with role-based dashboards.
- **Conflict-Free Academic Timetables:** Automated weekly class schedules generated for all sections (CSE-DS Year II, III, IV) across R25 and R22 regulations.
- **Optimized Exam Timetables:** Graph-colored exam schedules using minimum time slots with zero student exam clashes.
- **Anti-Malpractice Seating Plans:** Branch-interleaved seating layouts with downloadable room-wise PDF blueprints for each exam session.
- **Balanced Invigilation Duties:** Fair round-robin invigilator assignment sheets eliminating manual duty allocation.
- **Transparent Faculty Workload:** Uniform workload distribution across department staff with clear weekly period tracking.
- **Streamlined Student Experience:** Mobile-friendly dashboard allowing students to view personalized daily schedules, exam rooms, and seating hall assignments in real time.
- **One-Click Export:** Branded Excel and PDF outputs ready for departmental committees, examination cells, and institutional records.

---

## SLIDE 10 — 9. Limitations (Optional)

1. **Cloud Dependency:** Requires active internet connectivity for real-time synchronization with Cloud Firestore.
2. **Computational Scaling Bounds:** Browser-side local solver execution for massive university-scale grids (>500 sections) would benefit from backend cloud function worker offloading.
3. **Hardware Attendance Mocking:** Physical RFID/Biometric attendance integration currently relies on a simulated gateway service interface pending physical hardware installation.
4. **DSatur Optimality:** While DSatur generally produces near-optimal chromatic partitions, it is a heuristic — for extreme edge cases with very dense conflict graphs, an exact backtracking solver may yield fewer time slots at higher computational cost.
5. **Single Department Scope:** Current deployment targets CSE-DS department; cross-department room sharing policies require additional configuration for institution-wide rollout.

---

## SIGN-OFF PAGE

```
════════════════════════════════════════════════════════════════════════════
                  DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
                                  (Data Science)
                    VIGNANA BHARATHI INSTITUTE OF TECHNOLOGY
════════════════════════════════════════════════════════════════════════════

Project Title  : AI-Powered Academic Timetable Generation and
                 Resource Management System
Academic Year  : 2025 – 2026


   ____________________         ____________________         ____________________
      Student Name                   Guide Name                Coordinator Name
     (Roll No / Sign)             (Designation / Sign)            (HOD / Sign)
════════════════════════════════════════════════════════════════════════════
```

---

## 🎤 SPEAKER NOTES FOR VIVA / PRESENTATION

### Slide 1 — Title Slide
> "Respected Guide, Department Coordinator, and Panel Members. Good morning/afternoon. Today, I am presenting our proposed project titled **'AI-Powered Academic Timetable Generation and Resource Management System'**, developed specifically for the Department of Computer Science and Engineering (Data Science) at Vignana Bharathi Institute of Technology."

### Slide 2 — Introduction
> "In autonomous institutions like VBIT, creating an academic schedule is one of the most tedious administrative tasks. We have to balance multiple regulations like R25 and R22, manage shared computer labs, ensure faculty workload limits are respected, and prevent exam clashes for students with backlogs. Beyond class scheduling, the exam scheduling problem is even more complex — it is an NP-hard graph coloring problem. Additionally, exam seating must be arranged to prevent malpractice. Doing all of this manually takes weeks and often results in errors. Our system solves this using Artificial Intelligence and Data Science optimization algorithms."

### Slide 3 — Objectives
> "Our primary objective is to create a 100% clash-free timetable and exam scheduling solver. Our specific objectives include: graph-colored exam scheduling using the DSatur algorithm that guarantees no student has overlapping exams; anti-malpractice column-interleaved seating allocation; automated invigilation assignment with round-robin workload balancing; an intelligent faculty substitution engine; and one-click PDF/Excel export capabilities."

### Slide 4 & 5 — Description & Modules
> "The system consists of 7 modular components. The Timetable Engine uses CSP backtracking with MRV heuristics. The Exam Scheduler models the exam problem as a graph — courses are vertices, shared students create edges — and applies the DSatur algorithm to find the minimum chromatic partition. The Seating Allocation Engine uses a column-interleaving algorithm on a 4×6 room grid to alternate branches across adjacent columns, preventing same-branch adjacency. The system also validates 5 critical constraints: adjacent column branch diversity, ascending roll number order, no duplicate seating, correct invigilator count, and no faculty double-booking."

### Slide 6 — Architecture & Workflow
> "Architecturally, we use a 3-tier system: React 19 for the frontend, custom algorithm engines in the application layer, and Firebase Cloud Firestore for the database layer. For exam scheduling specifically — when the admin submits an exam list with enrolled students, the system builds a conflict graph, applies DSatur coloring to determine minimum time slots, then assigns rooms using greedy capacity matching. For seating, students are grouped by branch, sorted by hall ticket, and interleaved into room grids with alternating branch columns."

### Slide 7 — Technologies Used
> "We leverage React 19 and Zustand for the frontend, Firebase for RBAC authentication and Firestore database. Core algorithms include: CSP Backtracking with MRV heuristic for class timetabling, DSatur and Welsh-Powell Graph Coloring for exam scheduling, Column-Interleaved Matrix Algorithm for anti-malpractice seating, and multi-factor weighted scoring for faculty substitution. Reports are generated using ExcelJS for multi-tab spreadsheets and jsPDF for branded PDF documents."

### Slide 8 & 9 — Merits & Expected Outcomes
> "The system guarantees zero schedule and exam clashes, cuts generation time from weeks to seconds, prevents exam malpractice through smart seating matrix generation, automates invigilation duty allocation with workload fairness, and provides instant faculty leave substitution. The expected outcome is a fully operational enterprise portal for VBIT CSE-DS producing conflict-free class timetables, graph-colored exam schedules, anti-malpractice seating blueprints, and institutional-quality exported reports."

### Slide 10 — Limitations
> "Currently, the system requires internet access for Firestore sync. DSatur is a heuristic that produces near-optimal results but not always the absolute minimum chromatic number. Physical hardware biometric integration is implemented as a simulated service layer. And the current scope targets the CSE-DS department — institution-wide deployment requires additional cross-department room sharing configuration."
