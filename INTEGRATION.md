# SENTINEL CRMS v2.0 — FRONTEND EXTENSION

## New Folder Structure

```
src/
├── services/
│   └── api.js                    ← All API calls (extended)
│
├── components/
│   ├── shared/
│   │   ├── Sidebar.jsx           ← Updated sidebar with all new nav items
│   │   └── UI.jsx                ← Shared: Card, Table, StatusBadge, Modal, etc.
│   ├── timeline/
│   │   └── CaseTimeline.jsx      ← Drop into CaseDetail: <CaseTimeline caseId={id} />
│   ├── evidence/
│   │   └── EvidenceViewer.jsx    ← Drop into CaseDetail: <EvidenceViewer caseId={id} />
│   └── (your existing components)
│
├── pages/
│   ├── IntelligenceHub.jsx       ← /intelligence
│   ├── AnalyticsCenter.jsx       ← /analytics
│   ├── AlertsIncidents.jsx       ← /alerts
│   ├── GeoCrimeMap.jsx           ← /map
│   ├── CriminalNetwork.jsx       ← /network
│   ├── SystemMonitor.jsx         ← /system
│   ├── TaskScheduler.jsx         ← /tasks
│   ├── RoleManagement.jsx        ← /roles
│   └── (your existing pages)
│
└── App.jsx                       ← Updated router with all new routes
```

## Integration Steps

### 1. Install dependencies
```bash
npm install recharts
# Leaflet loaded via CDN in GeoCrimeMap.jsx (no install needed)
```

### 2. Merge App.jsx routes
In your existing App.jsx, add the new routes alongside your current ones:
```jsx
import IntelligenceHub  from './pages/IntelligenceHub';
import AnalyticsCenter  from './pages/AnalyticsCenter';
import AlertsIncidents  from './pages/AlertsIncidents';
import GeoCrimeMap      from './pages/GeoCrimeMap';
import CriminalNetwork  from './pages/CriminalNetwork';
import SystemMonitor    from './pages/SystemMonitor';
import TaskScheduler    from './pages/TaskScheduler';
import RoleManagement   from './pages/RoleManagement';

// Add to Routes:
<Route path="/intelligence" element={<IntelligenceHub />} />
<Route path="/analytics"    element={<AnalyticsCenter />} />
<Route path="/alerts"       element={<AlertsIncidents />} />
<Route path="/map"          element={<GeoCrimeMap />} />
<Route path="/network"      element={<CriminalNetwork />} />
<Route path="/system"       element={<SystemMonitor />} />
<Route path="/tasks"        element={<TaskScheduler />} />
<Route path="/roles"        element={<RoleManagement />} />
```

### 3. Update Sidebar
Replace your existing sidebar with `components/shared/Sidebar.jsx`
or manually add the new nav items from the NAV array.

### 4. Drop Timeline into CaseDetail
```jsx
import CaseTimeline from '../components/timeline/CaseTimeline';
// Inside your CaseDetail page:
<CaseTimeline caseId={caseId} />
```

### 5. Drop EvidenceViewer into CaseDetail
```jsx
import EvidenceViewer from '../components/evidence/EvidenceViewer';
<EvidenceViewer caseId={caseId} />
```

### 6. Tailwind classes
All components use only core Tailwind utility classes — no config changes needed.

## API Endpoints Used

| Page              | Endpoints                                      |
|-------------------|------------------------------------------------|
| IntelligenceHub   | GET /criminals/repeat-offenders, GET /cases    |
| AnalyticsCenter   | GET /dashboard/stats, GET /dashboard/crime-trends, GET /dashboard/officer-workload |
| AlertsIncidents   | GET /cases (status=Open, priority=High)        |
| GeoCrimeMap       | GET /fir                                       |
| CriminalNetwork   | GET /criminals                                 |
| SystemMonitor     | GET /dashboard/stats, GET /audit               |
| TaskScheduler     | GET /officers, GET /cases (localStorage tasks) |
| RoleManagement    | Static UI — wire to PATCH /api/roles/:id/perms |
| CaseTimeline      | GET /cases/:id/timeline                        |
| EvidenceViewer    | GET /cases/:id/evidence                        |
