class AuthRoles {
    constructor() {
        this.timestamp = "2025-02-02 05:30:11";
        this.currentUser = "samul005";
        this.db = firebase.firestore();

        this.roles = {
            admin: {
                level: 100,
                permissions: ['*']
            },
            moderator: {
                level: 75,
                permissions: [
                    'read.*',
                    'write.content',
                    'moderate.users',
                    'moderate.content'
                ]
            },
            editor: {
                level: 50,
                permissions: [
                    'read.*',
                    'write.content'
                ]
            },
            user: {
                level: 25,
                permissions: [
                    'read.public',
                    'write.own'
                ]
            },
            guest: {
                level: 0,
                permissions: [
                    'read.public'
                ]
            }
        };
    }

    async assignRole(userId, roleName) {
        try {
            if (!this.roles[roleName]) {
                throw new Error(`Invalid role: ${roleName}`);
            }

            await this.db.collection('users').doc(userId).update({
                role: roleName,
                roleLevel: this.roles[roleName].level,
                permissions: this.roles[roleName].permissions,
                roleUpdatedAt: this.timestamp,
                roleUpdatedBy: this.currentUser
            });

            await this.logRoleChange(userId, roleName);
        } catch (error) {
            await this.logRoleError(userId, roleName, error);
            throw error;
        }
    }

    async checkPermission(userId, permission) {
        try {
            const user = await this.db.collection('users')
                .doc(userId)
                .get();

            if (!user.exists) {
                return false;
            }

            const userData = user.data();
            const userRole = this.roles[userData.role];

            if (!userRole) {
                return false;
            }

            return this.hasPermission(userRole.permissions, permission);
        } catch (error) {
            await this.logPermissionCheck(userId, permission, false, error);
            return false;
        }
    }

    hasPermission(userPermissions, requiredPermission) {
        return userPermissions.some(permission => {
            if (permission === '*') {
                return true;
            }

            const permParts = permission.split('.');
            const reqParts = requiredPermission.split('.');

            return permParts.every((part, index) => 
                part === '*' || part === reqParts[index]
            );
        });
    }

    async getRoleHierarchy(userId) {
        const user = await this.db.collection('users')
            .doc(userId)
            .get();

        if (!user.exists) {
            return [];
        }

        const userData = user.data();
        const userLevel = this.roles[userData.role]?.level || 0;

        return Object.entries(this.roles)
            .filter(([_, role]) => role.level <= userLevel)
            .map(([name, role]) => ({
                name,
                level: role.level,
                permissions: role.permissions
            }))
            .sort((a, b) => b.level - a.level);
    }

    async createCustomRole(roleName, permissions, level) {
        try {
            // Validate role data
            this.validateRoleData(roleName, permissions, level);

            // Add role to database
            await this.db.collection('custom_roles').doc(roleName).set({
                permissions,
                level,
                createdAt: this.timestamp,
                createdBy: this.currentUser
            });

            // Update local roles
            this.roles[roleName] = {
                level,
                permissions
            };

            await this.logRoleCreation(roleName);
        } catch (error) {
            await this.logRoleError(null, roleName, error);
            throw error;
        }
    }

    validateRoleData(roleName, permissions, level) {
        if (!roleName || typeof roleName !== 'string') {
            throw new Error('Invalid role name');
        }

        if (!Array.isArray(permissions)) {
            throw new Error('Permissions must be an array');
        }

        if (typeof level !== 'number' || level < 0 || level > 100) {
            throw new Error('Level must be a number between 0 and 100');
        }

        if (this.roles[roleName]) {
            throw new Error('Role already exists');
        }
    }

    async updateRole(roleName, updates) {
        try {
            const role = this.roles[roleName];
            if (!role) {
                throw new Error(`Role not found: ${roleName}`);
            }

            // Update role in database
            await this.db.collection('custom_roles').doc(roleName).update({
                ...updates,
                updatedAt: this.timestamp,
                updatedBy: this.currentUser
            });

            // Update local roles
            this.roles[roleName] = {
                ...role,
                ...updates
            };

            await this.logRoleUpdate(roleName, updates);
        } catch (error) {
            await this.logRoleError(null, roleName, error);
            throw error;
        }
    }

    async deleteRole(roleName) {
        try {
            if (this.isProtectedRole(roleName)) {
                throw new Error(`Cannot delete protected role: ${roleName}`);
            }

            // Remove role from database
            await this.db.collection('custom
