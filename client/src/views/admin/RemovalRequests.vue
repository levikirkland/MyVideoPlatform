<template>
  <v-container fluid class="py-8">
    <v-breadcrumbs :items="[
      { title: 'Admin', disabled: false, to: '/admin/dashboard' },
      { title: 'Removal Requests', disabled: true }
    ]" class="px-0 mb-4"></v-breadcrumbs>
    <div class="mb-6">
      <h1 class="text-h3 font-weight-bold">Removal Requests</h1>
      <p class="text-grey">Review and process video removal requests</p>
    </div>

    <v-card v-if="requests.length === 0" class="text-center py-8">
      <v-card-text>
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-check-circle-outline</v-icon>
        <p class="text-h6 text-grey">No pending requests</p>
      </v-card-text>
    </v-card>

    <v-row v-else>
      <v-col v-for="req in requests" :key="req.id" cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span class="text-truncate">{{ req.video_title }}</span>
            <v-spacer></v-spacer>
            <v-chip size="small" color="warning">Pending</v-chip>
          </v-card-title>
          <v-card-subtitle>
            Requested by {{ req.requester_name }} on {{ new Date(req.created_at).toLocaleDateString() }}
          </v-card-subtitle>
          <v-card-text>
            <p><strong>Reason:</strong> {{ req.reason }}</p>
            <p class="mt-2">{{ req.description }}</p>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn color="error" variant="text" @click="processRequest(req, 'rejected')">Reject</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="success" variant="text" @click="processRequest(req, 'approved')">Approve & Remove Video</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const requests = ref([]);
const uiStore = useUiStore();

const fetchRequests = async () => {
  try {
    const res = await axios.get('/admin/removal-requests');
    requests.value = res.data;
  } catch (error) {
    console.error(error);
  }
};

const processRequest = async (req, status) => {
  const confirmed = await uiStore.confirm(`Are you sure you want to ${status} this request?`, 'Process Request');
  if (!confirmed) return;
  
  try {
    await axios.post(`/admin/removal-requests/${req.id}/process`, {
      status,
      admin_notes: `Processed via admin dashboard`
    });
    uiStore.showSuccess(`Request ${status}`);
    fetchRequests();
  } catch (error) {
    uiStore.showError('Error processing request');
  }
};

onMounted(fetchRequests);
</script>
