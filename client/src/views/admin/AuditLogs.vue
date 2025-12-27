<template>
  <v-container fluid class="py-8">
    <div class="mb-6">
      <h1 class="text-h3 font-weight-bold">Audit Logs</h1>
      <p class="text-grey">System activity and admin actions</p>
    </div>

    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search logs..."
          variant="outlined"
          density="compact"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Entity Type</th>
          <th>Actor</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>
            <v-chip size="small" :color="getActionColor(log.action)">
              {{ log.action }}
            </v-chip>
          </td>
          <td>{{ log.entity_type }}</td>
          <td>{{ log.actor_name || 'System' }}</td>
          <td>{{ formatDate(log.created_at) }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const logs = ref([]);
const searchQuery = ref('');

const fetchLogs = async () => {
  try {
    const response = await axios.get('/api/v1/admin/audit-logs');
    logs.value = response.data;
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
};

const getActionColor = (action) => {
  const colorMap = {
    'approve': 'success',
    'reject': 'error',
    'update_role': 'info',
    'delete': 'error',
    'create': 'success'
  };
  return colorMap[action] || 'default';
};

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

onMounted(fetchLogs);
</script>
