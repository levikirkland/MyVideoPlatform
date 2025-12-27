<template>
  <v-container fluid class="py-8">
    <h1 class="text-h3 font-weight-bold mb-8">Admin Dashboard</h1>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text class="text-center py-6">
            <v-icon size="48" color="primary" class="mb-2">mdi-account</v-icon>
            <p class="text-h6">{{ stats.users }}</p>
            <p class="text-grey text-caption">Total Users</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text class="text-center py-6">
            <v-icon size="48" color="primary" class="mb-2">mdi-video</v-icon>
            <p class="text-h6">{{ stats.videos }}</p>
            <p class="text-grey text-caption">Total Videos</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text class="text-center py-6">
            <v-icon size="48" color="warning" class="mb-2">mdi-clock</v-icon>
            <p class="text-h6">{{ stats.pendingVideos }}</p>
            <p class="text-grey text-caption">Pending Approval</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text class="text-center py-6">
            <v-icon size="48" color="error" class="mb-2">mdi-flag</v-icon>
            <p class="text-h6">{{ stats.pendingFlags }}</p>
            <p class="text-grey text-caption">Pending Flags</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-8"></v-divider>

    <v-row class="mb-8">
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Quick Actions</h2>
        <div class="d-flex flex-wrap" style="gap: 16px">
          <v-btn to="/moderation" color="primary" prepend-icon="mdi-check-decagram">Approve Uploads</v-btn>
          <v-btn to="/admin/tags" color="secondary" prepend-icon="mdi-tag-multiple">Manage Tags</v-btn>
          <v-btn to="/admin/categories" color="secondary" prepend-icon="mdi-shape">Manage Categories</v-btn>
          <v-btn to="/admin/users" color="secondary" prepend-icon="mdi-account-group">Manage Users</v-btn>
          <v-btn to="/admin/removal-requests" color="secondary" prepend-icon="mdi-delete-alert">Removal Requests</v-btn>
          <v-btn to="/admin/logs" color="secondary" prepend-icon="mdi-history">Audit Logs</v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <h2 class="text-h5 font-weight-bold mb-4">System Info</h2>
        <v-card>
          <v-card-text>
            <p><strong>Platform:</strong> VideoPlatform Admin</p>
            <p><strong>Status:</strong> <v-chip color="success" size="small">Online</v-chip></p>
            <p><strong>Database:</strong> PostgreSQL</p>
            <p><strong>API Version:</strong> v1</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <h2 class="text-h5 font-weight-bold mb-4">System Settings</h2>
        <v-card>
          <v-card-text>
            <v-text-field
              v-model="settings.auto_unpublish_threshold"
              label="Auto-Unpublish Threshold (Reports)"
              type="number"
              variant="outlined"
              density="compact"
              hint="Number of reports before a video is automatically moved to pending approval"
              persistent-hint
              class="mb-4"
            ></v-text-field>
            <v-btn color="primary" @click="saveSettings" :loading="savingSettings">Save Settings</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const uiStore = useUiStore();
const stats = ref({
  users: 0,
  videos: 0,
  pendingVideos: 0,
  pendingFlags: 0
});

const settings = ref({
  auto_unpublish_threshold: 3
});
const savingSettings = ref(false);

const fetchStats = async () => {
  try {
    const response = await axios.get('/admin/stats');
    stats.value = response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

const fetchSettings = async () => {
  try {
    const response = await axios.get('/admin/settings');
    if (response.data.auto_unpublish_threshold) {
      settings.value.auto_unpublish_threshold = response.data.auto_unpublish_threshold;
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
};

const saveSettings = async () => {
  savingSettings.value = true;
  try {
    await axios.put('/admin/settings', { settings: settings.value });
    uiStore.showSuccess('Settings updated successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    uiStore.showError('Failed to save settings');
  } finally {
    savingSettings.value = false;
  }
};

onMounted(() => {
  fetchStats();
  fetchSettings();
});
</script>
