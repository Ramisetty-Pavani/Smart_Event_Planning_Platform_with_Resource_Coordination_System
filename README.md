# Smart Event Planning Platform with Resource Coordination System

## About the Project

The **Smart Event Planning Platform with Resource Coordination System** is a full-stack web application developed to simplify and organize the complete event planning process.

Planning an event involves managing multiple activities such as scheduling the event, registering participants, allocating resources, coordinating vendors, managing sponsors, tracking budgets and expenses, and handling attendance. Managing these activities manually can lead to scheduling conflicts, resource shortages, budget issues, and additional effort for organizers.

This project provides a centralized platform where these activities can be managed efficiently. It includes **conflict detection and prevention, capacity management, budget monitoring, QR-based attendance, notifications, role-based access, and dashboard analytics**.

The system is designed for different users such as **Administrators, Organizers, Participants, and Staff**, with access based on their roles.

### Main Objective

The main objective of this project is to **reduce manual effort, prevent event-related conflicts, improve resource utilization, and provide a centralized system for managing events and their associated activities**.

The system uses a **Django backend, React frontend, and SQLite database**.

---

## Project Overview

The Smart Event Planning Platform helps organizers manage the complete event lifecycle through a centralized system.

It reduces manual effort by providing event scheduling, attendee registration, resource and vendor coordination, budget monitoring, conflict detection and prevention, notifications, attendance tracking, and dashboard analytics.

---

## Key Features
## Key Features

### Event Management
- Create, view, update, and delete events
- Event date and time validation
- Event location conflict detection
- Event capacity management
- Completed event detection

### Attendee Registration
- Participant registration
- Email and phone validation
- Duplicate registration prevention
- Event capacity validation
- Registration cancellation
- Capacity release after cancellation
- Registration status tracking
- Prevention of registration for completed events

### Resource Management
- Create, view, update, and delete resources
- Track resource quantity and availability
- Allocate resources to events
- Detect resource conflicts
- Prevent resource over-allocation
- Support different dates and non-overlapping time periods

### Vendor Management
- Add, view, update, and delete vendors
- Assign vendors to events
- Track vendor services and costs
- Track vendor status
- Detect overlapping vendor assignments
- Prevent vendor scheduling conflicts

### Budget and Expense Management
- Event budget management
- Expense tracking and categorization
- Remaining budget calculation
- Budget utilization monitoring
- Automatic budget alerts

### Sponsor Management
- Add, view, update, and delete sponsors
- Associate sponsors with events
- Track sponsor contributions

### QR Code and Attendance
- Generate unique QR codes for registrations
- QR-based attendance scanning
- Track participant attendance
- Present and Absent status management

### Dashboard and Analytics
- Total events
- Registration statistics
- Attendance rate
- Budget and expense statistics
- Current and prevented conflicts
- Resource availability
- System status

### Notifications and Conflict Records
- Notifications for important system activities
- Resource conflict notifications
- Vendor conflict notifications
- Budget alerts
- Records of prevented conflicts

### Authentication
- User registration
- Login and logout
- Role-based access
- Profile management
- Change password
- Forgot password
- Password reset

---

## Role-Based Access

| Feature | Admin | Organizer | Participant | Staff |
|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes |
| Events | Manage | Manage | View/Register | View |
| Registrations | Manage | Manage | Own | View |
| Resources | Yes | Yes | No | No |
| Allocations | Yes | Yes | No | No |
| Vendors | Yes | Yes | No | No |
| Budgets | Yes | Yes | No | No |
| Sponsors | Yes | Yes | No | No |
| Conflicts | Yes | Yes | No | No |
| QR Scanner | Yes | Yes | No | Yes |
| Profile | Yes | Yes | Yes | Yes |
| Change Password | Yes | Yes | Yes | Yes |

---

## Technologies Used

### Backend
- Python
- Django
- Django REST-style APIs
- SQLite

### Frontend
- React
- Vite
- JavaScript
- HTML
- CSS

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Thunder Client

---

## System Architecture

```text
                 Smart Event Planning Platform
                            |
              +-------------+-------------+
              |                           |
        React Frontend              Django Backend
              |                           |
        User Interface             Business Logic
              |                           |
              +------------ API -----------+
                            |
                       SQLite Database