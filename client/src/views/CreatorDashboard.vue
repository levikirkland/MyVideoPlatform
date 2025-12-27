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
                  aspect-ratio="16/9"
                  cover
                  class="rounded mr-3 bg-grey-darken-3"
                >
                  <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center h-100">
                      <v-icon color="grey-darken-1">mdi-video</v-icon>
                    </div>
                  </template>
                </v-img>
                <div class="text-truncate" style="max-width: 300px;">
                  <div class="text-subtitle-2 font-weight-bold text-truncate">{{ item.title }}</div>
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
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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
    followRequests.value = fRes.data;
  } catch (error) {
    console.error('Error fetching creator data:', error);
  } finally {
    loading.value = false;
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
