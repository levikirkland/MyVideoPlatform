<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Creator Dashboard</h1>
      <v-btn color="primary" prepend-icon="mdi-upload" to="/upload?community=true">
        Upload Community Video
      </v-btn>
    </div>

    <v-tabs v-model="tab">
      <v-tab value="videos">My Videos</v-tab>
      <v-tab value="follows">Follow Requests</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-4">
      <v-window-item value="videos">
        <v-card>
          <v-data-table :headers="videoHeaders" :items="videos" :loading="loading">
            <template v-slot:item.video="{ item }">
              <div class="d-flex align-center py-2">
                <v-img
                  :src="item.thumbnail_url || '/placeholder-video.png'"
                  width="80"
                  height="45"
                  cover
                  class="rounded mr-3 bg-grey-darken-3 flex-shrink-0"
                >
                  <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center h-100">
                      <v-icon color="grey-darken-1" size="16">mdi-video</v-icon>
                    </div>
                  </template>
                </v-img>
                <div class="text-truncate" style="max-width: 250px;">
                  <div class="text-body-2 font-weight-medium text-truncate">{{ item.title }}</div>
                  <div class="text-caption text-grey text-truncate">{{ item.description }}</div>
                </div>
              </div>
            </template>
            <template v-slot:item.is_private="{ item }">
              <div class="d-flex flex-column">
                <v-chip :color="item.is_private ? 'warning' : 'success'" size="x-small" class="mb-1">
                  {{ item.is_private ? 'Private' : 'Public' }}
                </v-chip>
                <v-chip v-if="item.is_community" color="info" size="x-small">
                  Community
                </v-chip>
              </div>
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="x-small">
                {{ item.status }}
              </v-chip>
            </template>
            <template v-slot:item.access_mode="{ item }">
              <div class="d-flex flex-column">
                <v-chip :color="getAccessColor(item.access_mode)" size="x-small" class="mb-1 text-uppercase">
                  {{ formatAccessLabel(item.access_mode) }}
                </v-chip>
                <v-btn
                  size="x-small"
                  variant="text"
                  class="px-0 text-caption"
                  @click="openAccessManager(item)"
                >
                  Manage
                </v-btn>
              </div>
            </template>
            <template v-slot:item.created_at="{ item }">
              <div class="text-caption">{{ formatDate(item.created_at) }}</div>
            </template>
            <template v-slot:item.stats="{ item }">
              <div class="d-flex flex-column text-caption">
                <span><v-icon size="12">mdi-eye</v-icon> {{ item.views_count }}</span>
                <span><v-icon size="12">mdi-thumb-up</v-icon> {{ item.likes_count }}</span>
              </div>
            </template>
            <template v-slot:item.actions="{ item }">
              <div class="d-flex">
                <v-btn icon size="x-small" color="primary" class="mr-1" @click="editVideo(item)" title="Edit Details">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon size="x-small" color="secondary" class="mr-1" @click="openThumbnailTool(item)" title="Thumbnail Tool">
                  <v-icon>mdi-image-edit</v-icon>
                </v-btn>
                <v-btn icon size="x-small" color="error" @click="deleteVideo(item.id)" title="Delete">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="follows">
        <v-card>
          <v-data-table :headers="followHeaders" :items="followRequests" :loading="loading">
            <template v-slot:item.avatar_url="{ item }">
              <v-avatar size="32">
                <v-img :src="item.avatar_url || '/default-avatar.png'"></v-img>
              </v-avatar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn color="success" size="small" class="mr-2" @click="processFollow(item.follower_id, 'approved')">
                Approve
              </v-btn>
              <v-btn color="error" size="small" @click="processFollow(item.follower_id, 'rejected')">
                Reject
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Edit Video Dialog -->
    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-card-title>Edit Video</v-card-title>
        <v-card-text>
          <v-text-field v-model="editedVideo.title" label="Title"></v-text-field>
          <v-textarea v-model="editedVideo.description" label="Description"></v-textarea>
          <v-switch v-model="editedVideo.is_private" label="Private Video (Followers Only)" color="primary" inset></v-switch>
          <v-switch v-model="editedVideo.is_community" label="Community Video" color="info" inset></v-switch>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="saveVideo">Save</v-btn>
          <v-btn text @click="editDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Thumbnail Tool Dialog -->
    <v-dialog v-model="thumbnailDialog" max-width="500px">
      <v-card>
        <v-card-title>Thumbnail Tool</v-card-title>
        <v-card-text class="text-center">
          <v-img
            :src="editedVideo.thumbnail_url || '/placeholder-video.png'"
            aspect-ratio="16/9"
            class="rounded mb-4 bg-grey-darken-3"
          ></v-img>
          <p class="text-body-2 mb-4">Upload a custom thumbnail or choose an auto-generated one (coming soon).</p>
          <v-file-input
            label="Upload Custom Thumbnail"
            accept="image/*"
            prepend-icon="mdi-camera"
            variant="outlined"
            @change="handleThumbnailUpload"
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="thumbnailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Access Controls Dialog -->
    <v-dialog v-model="accessDialog" max-width="640px">
      <v-card>
        <v-card-title>Access Controls</v-card-title>
        <v-card-subtitle class="text-caption">{{ accessVideo?.title }}</v-card-subtitle>
        <v-card-text>
          <v-select
            v-if="accessVideo"
            v-model="accessVideo.access_mode"
            :items="accessModeOptions"
            item-title="label"
            item-value="value"
            label="Access Mode"
            variant="outlined"
            class="mb-2"
          ></v-select>
          <p class="text-caption text-grey-lighten-1 mb-4">{{ currentAccessDescription }}</p>

          <v-text-field
            v-if="accessVideo?.access_mode === 'username_only'"
            v-model="accessVideo.single_username"
            label="Primary username"
            variant="outlined"
            hint="Optional shortcut for a single VIP without editing the full list."
            persistent-hint
            class="mb-4"
          ></v-text-field>

          <v-btn
            color="primary"
            class="mb-6"
            :loading="savingAccessMode"
            :disabled="!accessVideo"
            @click="saveAccessMode"
          >
            Save Access Settings
          </v-btn>

          <v-divider class="my-4"></v-divider>

          <div class="d-flex align-center mb-3">
            <h3 class="text-subtitle-1 mb-0">Manual Username Grants</h3>
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              :loading="accessLoading"
              @click="refreshAccessEntries"
            ></v-btn>
          </div>

          <div class="d-flex flex-wrap align-center" style="gap: 12px;">
            <v-text-field
              v-model="newAccessUsername"
              label="Username"
              variant="outlined"
              hide-details
              density="comfortable"
              class="flex-grow-1"
            ></v-text-field>
            <v-btn color="secondary" :loading="grantingAccess" @click="grantManualAccess">
              Grant
            </v-btn>
          </div>

          <div v-if="accessLoading" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
          </div>
          <div v-else class="d-flex flex-wrap" style="gap: 8px;">
            <v-chip
              v-for="entry in accessEntries"
              :key="entry.id"
              closable
              @click:close="revokeManualAccess(entry.username)"
            >
              {{ entry.username }}
              <span class="text-caption text-grey-lighten-1 ml-2">{{ formatDate(entry.granted_at) }}</span>
            </v-chip>
            <p v-if="accessEntries.length === 0" class="text-caption text-grey-lighten-1">
              No manual grants yet.
            </p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="accessDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const tab = ref('videos');
const videos = ref([]);
const followRequests = ref([]);
const loading = ref(false);
const editDialog = ref(false);
const thumbnailDialog = ref(false);
const editedVideo = ref({});
const uiStore = useUiStore();
const accessDialog = ref(false);
const accessVideo = ref(null);
const accessEntries = ref([]);
const accessLoading = ref(false);
const savingAccessMode = ref(false);
const grantingAccess = ref(false);
const newAccessUsername = ref('');

const accessModeOptions = [
  { label: 'Public (default)', value: 'public' },
  { label: 'Members Only', value: 'paidfans' },
  { label: 'Username Gate', value: 'username_only' }
];

const accessDescriptions = {
  public: 'Visible to every paying member once moderation approves it.',
  paidfans: 'Only viewers with an active site membership can press play.',
  username_only: 'Only usernames that you explicitly grant can stream this video.'
};

const currentAccessDescription = computed(() => {
  if (!accessVideo.value) return '';
  return accessDescriptions[accessVideo.value.access_mode] || '';
});

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending_approval': return 'warning';
    case 'rejected': return 'error';
    case 'removed': return 'error';
    default: return 'grey';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatAccessLabel = (mode) => {
  switch (mode) {
    case 'paidfans':
      return 'Members Only';
    case 'username_only':
      return 'Username Gate';
    default:
      return 'Public';
  }
};

const getAccessColor = (mode) => {
  switch (mode) {
    case 'paidfans':
      return 'warning';
    case 'username_only':
      return 'info';
    default:
      return 'success';
  }
};

const openThumbnailTool = (video) => {
  editedVideo.value = { ...video };
  thumbnailDialog.value = true;
};

const handleThumbnailUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('thumbnail', file);

  try {
    await axios.post(`/videos/${editedVideo.value.id}/thumbnail`, formData);
    uiStore.showSuccess('Thumbnail updated successfully');
    thumbnailDialog.value = false;
    fetchData();
  } catch (error) {
    uiStore.showError('Failed to update thumbnail');
  }
};

const videoHeaders = [
  { title: 'Video', key: 'video', width: '320px' },
  { title: 'Visibility', key: 'is_private' },
  { title: 'Status', key: 'status' },
  { title: 'Access', key: 'access_mode', sortable: false },
  { title: 'Date', key: 'created_at' },
  { title: 'Stats', key: 'stats', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

const followHeaders = [
  { title: 'Avatar', key: 'avatar_url', sortable: false },
  { title: 'Username', key: 'username' },
  { title: 'Requested At', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const [vRes, fRes] = await Promise.all([
      axios.get('/videos/creator/my-videos'),
      axios.get('/videos/creator/follow-requests')
    ]);
    videos.value = vRes.data;
    if (accessVideo.value) {
      const refreshed = vRes.data.find((video) => video.id === accessVideo.value.id);
      if (refreshed) {
        accessVideo.value = { ...accessVideo.value, ...refreshed };
      }
    }
    followRequests.value = fRes.data;
  } catch (error) {
    console.error('Error fetching creator data:', error);
  } finally {
    loading.value = false;
  }
};

const openAccessManager = async (video) => {
  accessVideo.value = { ...video };
  accessDialog.value = true;
  newAccessUsername.value = '';
  await fetchAccessEntries(video.id);
};

const fetchAccessEntries = async (videoId) => {
  accessLoading.value = true;
  try {
    const { data } = await axios.get(`/videos/${videoId}/access`);
    accessEntries.value = data;
  } catch (error) {
    uiStore.showError('Unable to load access list');
  } finally {
    accessLoading.value = false;
  }
};

const refreshAccessEntries = () => {
  if (accessVideo.value) {
    fetchAccessEntries(accessVideo.value.id);
  }
};

const saveAccessMode = async () => {
  if (!accessVideo.value) return;
  savingAccessMode.value = true;
  try {
    const payload = {
      access_mode: accessVideo.value.access_mode,
      single_username: accessVideo.value.single_username || undefined
    };
    const { data } = await axios.put(`/videos/${accessVideo.value.id}/access-mode`, payload);
    uiStore.showSuccess('Access mode updated');
    const index = videos.value.findIndex((video) => video.id === accessVideo.value.id);
    if (index !== -1) {
      videos.value[index] = { ...videos.value[index], ...data.video };
    }
    accessVideo.value = { ...accessVideo.value, ...data.video };
  } catch (error) {
    const message = error.response?.data?.message || 'Unable to update access mode';
    uiStore.showError(message);
  } finally {
    savingAccessMode.value = false;
  }
};

const grantManualAccess = async () => {
  if (!accessVideo.value) return;
  const username = newAccessUsername.value.trim();
  if (!username) {
    uiStore.showWarning('Enter a username to grant access');
    return;
  }
  grantingAccess.value = true;
  try {
    await axios.post(`/videos/${accessVideo.value.id}/access`, { username });
    uiStore.showSuccess('Access granted');
    newAccessUsername.value = '';
    await fetchAccessEntries(accessVideo.value.id);
  } catch (error) {
    const message = error.response?.data?.message || 'Unable to grant access';
    uiStore.showError(message);
  } finally {
    grantingAccess.value = false;
  }
};

const revokeManualAccess = async (username) => {
  if (!accessVideo.value) return;
  try {
    await axios.delete(`/videos/${accessVideo.value.id}/access/${encodeURIComponent(username)}`);
    accessEntries.value = accessEntries.value.filter((entry) => entry.username !== username);
    uiStore.showInfo('Access revoked');
  } catch (error) {
    uiStore.showError('Unable to revoke access');
  }
};

const editVideo = (video) => {
  editedVideo.value = { ...video };
  editDialog.value = true;
};

const saveVideo = async () => {
  try {
    await axios.put(`/videos/${editedVideo.value.id}`, editedVideo.value);
    editDialog.value = false;
    fetchData();
  } catch (error) {
    console.error('Error saving video:', error);
  }
};

const deleteVideo = async (id) => {
  const confirmed = await uiStore.confirm('Are you sure you want to delete this video?', 'Delete Video');
  if (!confirmed) return;
  try {
    await axios.delete(`/videos/${id}`);
    fetchData();
  } catch (error) {
    console.error('Error deleting video:', error);
  }
};

const processFollow = async (followerId, status) => {
  try {
    await axios.put(`/videos/creator/follow-requests/${followerId}`, { status });
    fetchData();
  } catch (error) {
    console.error('Error processing follow request:', error);
  }
};

onMounted(fetchData);
</script>
