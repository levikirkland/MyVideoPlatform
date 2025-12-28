<template>
  <v-container>
    <v-breadcrumbs :items="[
      { title: 'Admin', disabled: false, to: '/admin/dashboard' },
      { title: 'Creator Requests', disabled: true }
    ]" class="px-0 mb-4"></v-breadcrumbs>
    <h1 class="text-h4 mb-6">Creator Requests</h1>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="requests"
        :loading="loading"
      >
        <template v-slot:item.id_photo_url="{ item }">
          <v-btn
            v-if="item.id_photo_url"
            icon
            small
            @click="viewPhoto(item.id_photo_url)"
          >
            <v-icon>mdi-image</v-icon>
          </v-btn>
          <span v-else>No Photo</span>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            color="success"
            small
            class="mr-2"
            @click="processRequest(item.id, 'approved')"
            :disabled="item.status !== 'pending'"
          >
            Approve
          </v-btn>
          <v-btn
            color="error"
            small
            @click="processRequest(item.id, 'rejected')"
            :disabled="item.status !== 'pending'"
          >
            Reject
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="photoDialog" max-width="800px">
      <v-card>
        <v-card-title>ID Photo Verification</v-card-title>
        <v-card-text>
          <v-img :src="selectedPhoto" contain max-height="600px"></v-img>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="photoDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';

const requests = ref([]);
const loading = ref(false);
const photoDialog = ref(false);
const selectedPhoto = ref('');

const headers = [
  { title: 'User', key: 'username' },
  { title: 'Status', key: 'status' },
  { title: 'ID Photo', key: 'id_photo_url', sortable: false },
  { title: 'Requested At', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const fetchRequests = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/admin/creator-requests');
    requests.value = response.data;
  } catch (error) {
    console.error('Error fetching creator requests:', error);
  } finally {
    loading.value = false;
  }
};

const processRequest = async (id, status) => {
  try {
    await axios.put(`/admin/creator-requests/${id}`, { status });
    fetchRequests();
  } catch (error) {
    console.error('Error processing request:', error);
  }
};

const viewPhoto = (url) => {
  selectedPhoto.value = url;
  photoDialog.value = true;
};

onMounted(fetchRequests);
</script>
