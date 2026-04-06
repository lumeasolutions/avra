# AVRA Permission Matrix

## Overview

Fine-grained role-based access control (RBAC) for AVRA API.

## Roles

### ADMIN
- Full system access
- Can manage users, workspaces, and all resources
- Can view audit logs
- Can change security settings

### MANAGER
- Can read and manage projects, documents, clients
- Can view and manage stock/orders
- Can manage team members within workspace
- Cannot delete users or change workspace settings

### EDITOR
- Can create and edit projects/documents
- Can view clients, stock, and orders
- Cannot delete resources
- Cannot manage users

### VIEWER
- Read-only access
- Cannot create, edit, or delete any resources
- Limited to viewing information

## Permission Hierarchy

### Workspace Permissions
- `workspace:read` - View workspace info
- `workspace:write` - Update workspace settings (ADMIN only)
- `workspace:delete` - Delete workspace (ADMIN only)

### User Management
- `users:read` - View user list
- `users:write` - Create/edit users
- `users:delete` - Delete users (ADMIN only)

### Clients
- `clients:read` - View clients
- `clients:write` - Create/edit clients
- `clients:delete` - Delete clients (ADMIN/MANAGER only)

### Projects
- `projects:read` - View projects
- `projects:write` - Create/edit projects
- `projects:delete` - Delete projects (ADMIN/MANAGER only)

### Documents
- `documents:read` - View documents
- `documents:write` - Upload/edit documents
- `documents:delete` - Delete documents (ADMIN/MANAGER only)

### Events
- `events:read` - View events
- `events:write` - Create/edit events
- `events:delete` - Delete events (ADMIN/MANAGER only)

### Stock Management
- `stock:read` - View inventory
- `stock:write` - Update inventory
- `stock:delete` - Delete inventory items (MANAGER only)

### Orders
- `orders:read` - View orders
- `orders:write` - Create/manage orders
- `orders:delete` - Delete orders (ADMIN/MANAGER only)

### Intervenants (Team)
- `intervenants:read` - View team members
- `intervenants:write` - Add/manage team members
- `intervenants:delete` - Remove team members (MANAGER only)

### Payments
- `payments:read` - View payment records
- `payments:write` - Record/update payments (MANAGER only)

### Audit & Security
- `audit:read` - View audit logs (ADMIN only)
- `security:write` - Manage security settings (ADMIN only)

## Permission Matrix Table

| Permission | ADMIN | MANAGER | EDITOR | VIEWER |
|------------|-------|---------|--------|--------|
| workspace:read | ✅ | ✅ | ✅ | ✅ |
| workspace:write | ✅ | ❌ | ❌ | ❌ |
| workspace:delete | ✅ | ❌ | ❌ | ❌ |
| users:read | ✅ | ✅ | ❌ | ❌ |
| users:write | ✅ | ✅ | ❌ | ❌ |
| users:delete | ✅ | ❌ | ❌ | ❌ |
| clients:read | ✅ | ✅ | ✅ | ✅ |
| clients:write | ✅ | ✅ | ❌ | ❌ |
| clients:delete | ✅ | ✅ | ❌ | ❌ |
| projects:read | ✅ | ✅ | ✅ | ✅ |
| projects:write | ✅ | ✅ | ✅ | ❌ |
| projects:delete | ✅ | ✅ | ❌ | ❌ |
| documents:read | ✅ | ✅ | ✅ | ✅ |
| documents:write | ✅ | ✅ | ✅ | ❌ |
| documents:delete | ✅ | ✅ | ❌ | ❌ |
| events:read | ✅ | ✅ | ✅ | ✅ |
| events:write | ✅ | ✅ | ✅ | ❌ |
| events:delete | ✅ | ✅ | ❌ | ❌ |
| stock:read | ✅ | ✅ | ✅ | ✅ |
| stock:write | ✅ | ✅ | ❌ | ❌ |
| stock:delete | ✅ | ✅ | ❌ | ❌ |
| orders:read | ✅ | ✅ | ✅ | ✅ |
| orders:write | ✅ | ✅ | ❌ | ❌ |
| orders:delete | ✅ | ✅ | ❌ | ❌ |
| intervenants:read | ✅ | ✅ | ✅ | ✅ |
| intervenants:write | ✅ | ✅ | ❌ | ❌ |
| intervenants:delete | ✅ | ✅ | ❌ | ❌ |
| payments:read | ✅ | ✅ | ❌ | ❌ |
| payments:write | ✅ | ✅ | ❌ | ❌ |
| audit:read | ✅ | ❌ | ❌ | ❌ |
| security:write | ✅ | ❌ | ❌ | ❌ |

## Implementation

Permissions are validated using:
1. `PermissionGuard` - Checks required permissions on each route
2. `WorkspaceGuard` - Ensures workspace isolation
3. `@Permission()` decorator - Specifies required permissions per endpoint

## Example Usage

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionGuard } from 'src/common/permissions/permission.guard';
import { Permission } from 'src/common/permissions/permission.decorator';

@Controller('documents')
@UseGuards(PermissionGuard)
export class DocumentsController {

  @Get()
  @Permission('documents:read')
  findAll() { ... }

  @Post()
  @Permission('documents:write')
  create() { ... }

  @Delete(':id')
  @Permission('documents:delete')
  delete() { ... }
}
```

## Workspace Isolation

Every request verifies that:
1. User is authenticated
2. User belongs to the requested workspace
3. User has required permissions for the action
4. Workspace ID in request params matches user's workspace ID

This prevents cross-workspace access and data leakage.
