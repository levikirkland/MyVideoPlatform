<template>
  <v-container fluid class="py-8">
    <div class="mb-6">
      <h1 class="text-h3 font-weight-bold">Manage Users</h1>
      <p class="text-grey">Manage user accounts and permissions</p>
    </div>

    <v-table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
          <th>Role</th>
          <th>Verified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ user.email }}</td>
          <td>
            <v-select
              :model-value="user.role"
              :items="['user', 'creator', 'moderator', 'admin']"
              size="small"
              density="compact"
              @update:model-value="(val) => updateUserRole(user.id, val)"
            ></v-select>
          </td>
          <td>
            <v-chip :color="user.email_verified ? 'success' : 'error'" size="small">
              {{ user.email_verified ? 'Yes' : 'No' }}
            </v-chip>
          </td>
          <td>
            <v-btn icon="mdi-account-eye" size="small" variant="text"></v-btn>
            <v-btn icon="mdi-gavel" size="small" variant="text" color="error" @click="openBanDialog(user)"></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Ban Dialog -->
    <v-dialog v-model="showBanDialog" max-width="500">
      <v-card>
        <v-card-title>Ban User: {{ selectedUser?.username }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="banDuration"
            :items="[
              { title: 'Permanent', value: null },
              { title: '24 Hours', value: 24 },
              { title: '7 Days', value: 168 },
              { title: '30 Days', value: 720 }
            ]"
            label="Duration"
            item-title="title"
            item-value="value"
          ></v-select>
          <v-textarea v-model="banReason" label="Reason"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showBanDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="banUser">Ban User</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const users = ref([]);
const uiStore = useUiStore();
const showBanDialog = ref(false);
const selectedUser = ref(null);
const banDuration = ref(null);
const banReason = ref('');

const fetchUsers = async () => {
  try {
    const res = await axios.get('/admin/users');
    users.value = res.data;
  } catch (error) {
    console.error(error);
  }
};

const updateUserRole = async (id, role) => {
  try {
    await axios.put(`/admin/users/${id}/role`, { role });
    uiStore.showSuccess('User role updated');
  } catch (error) {
    uiStore.showError('Failed to update role');
  }
};

const openBanDialog = (user) => {
  selectedUser.value = user;
  banDuration.value = null;
  banReason.value = '';
  showBanDialog.value = true;
};

const banUser = async () => {
  if (!selectedUser.value) return;
  try {
    await axios.post(`/admin/users/${selectedUser.value.id}/ban`, {
      reason: banReason.value,
      duration_hours: banDuration.value
    });
    showBanDialog.value = false;
    uiStore.showSuccess('User banned');
    fetchUsers();
  } catch (error) {
    uiStore.showError('Failed to ban user');
  }
};

onMounted(fetchUsers);
</script>
