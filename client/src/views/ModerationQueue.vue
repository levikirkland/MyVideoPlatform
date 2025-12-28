<template>
  <v-container fluid class="py-8">
    <v-breadcrumbs :items="[
      { title: 'Admin', disabled: false, to: '/admin/dashboard' },
      { title: 'Moderation Queue', disabled: true }
    ]" class="px-0 mb-4"></v-breadcrumbs>
    <h1 class="text-h3 font-weight-bold mb-8">Moderation Queue</h1>
    
    <v-tabs v-model="tab">
      <v-tab value="videos">Pending Videos ({{ pendingVideos.length }})</v-tab>
      <v-tab value="flags">Reported Content ({{ flags.length }})</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-6">
      <v-window-item value="videos">
        <div v-if="pendingVideos.length === 0" class="text-center py-12">
          <p class="text-h6 text-grey">No pending videos</p>
        </div>

        <v-row v-else>
          <v-col v-for="video in pendingVideos" :key="video.id" cols="12" sm="6" md="4" lg="3">
            <v-card class="elevation-2">
              <v-img
                :src="video.thumbnail_url"
                aspect-ratio="16/9"
                class="bg-grey-darken-4 cursor-pointer"
                @click="selectedVideo = video; showVideoDialog = true"
              >
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center h-100 bg-grey-darken-4">
                    <v-icon size="48" color="grey-darken-1">mdi-video-off</v-icon>
                  </div>
                </template>
                <div v-if="!video.thumbnail_url" class="d-flex align-center justify-center h-100 bg-grey-darken-4">
                    <v-icon size="48" color="grey-darken-1">mdi-video</v-icon>
                </div>
                <div class="d-flex align-center justify-center h-100 hover-overlay position-absolute top-0 w-100">
                  <v-icon size="48" color="white">mdi-play-circle</v-icon>
                </div>
              </v-img>

              <v-card-text class="pa-3">
                <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ video.title }}</h3>
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption text-grey">{{ video.uploader_name }}</span>
                  <span class="text-caption text-grey">{{ formatDate(video.created_at) }}</span>
                </div>

                <div class="d-flex gap-2 flex-wrap justify-space-between">
                  <v-btn 
                    size="x-small" 
                    variant="flat"
                    color="primary"
                    @click.stop="selectedVideo = video; showVideoDialog = true"
                    icon="mdi-eye"
                    class="mr-1"
                  ></v-btn>
                  <div class="d-flex gap-1">
                    <v-btn 
                      color="success" 
                      size="x-small"
                      @click.stop="openApproveDialog(video)"
                      prepend-icon="mdi-check"
                    >
                      Approve
                    </v-btn>
                    <v-btn 
                      color="error" 
                      size="x-small"
                      @click.stop="rejectDialog = true; selectedVideo = video"
                      prepend-icon="mdi-close"
                    >
                      Reject
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="flags">
        <div v-if="flags.length === 0" class="text-center py-12">
          <p class="text-h6 text-grey">No flagged content</p>
        </div>

        <v-table v-else>
          <thead>
            <tr>
              <th>Content</th>
              <th>Reason</th>
              <th>Reporter</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="flag in flags" :key="flag.id">
              <td>{{ flag.target_type }}</td>
              <td>{{ flag.reason }}</td>
              <td>{{ flag.reporter_name }}</td>
              <td><v-chip color="warning" size="small">{{ flag.flag_count }} flags</v-chip></td>
              <td>
                <v-btn size="small" color="primary" @click="reviewFlag(flag)">Review</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>
    </v-window>

    <!-- Video Preview Dialog -->
    <v-dialog v-model="showVideoDialog" max-width="1000">
      <v-card>
        <v-card-title>{{ selectedVideo?.title }}</v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-0">
          <div class="video-player-container mb-0 rounded-0">
            <video 
              :key="selectedVideo?.id"
              controls 
              class="video-player-main"
            >
              <source :src="getVideoUrl(selectedVideo?.video_url)" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>

          <div class="pa-6">
            <v-row>
              <v-col cols="12" md="6">
                <p><strong>Uploader:</strong> {{ selectedVideo?.uploader_name }}</p>
                <p><strong>Uploaded:</strong> {{ formatDate(selectedVideo?.created_at) }}</p>
                <p><strong>Size:</strong> {{ formatFileSize(selectedVideo?.file_size) }}</p>
              </v-col>
              <v-col cols="12" md="6">
                <p><strong>Status:</strong> {{ selectedVideo?.status }}</p>
                <p><strong>Duration:</strong> {{ formatDuration(selectedVideo?.duration_seconds) }}</p>
              </v-col>
            </v-row>

            <div v-if="selectedVideo?.description" class="mt-6">
              <h4 class="font-weight-bold mb-2">Description</h4>
              <p>{{ selectedVideo.description }}</p>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showVideoDialog = false">Close</v-btn>
          <v-btn color="success" @click="openApproveDialog(selectedVideo)">Approve</v-btn>
          <v-btn color="error" @click="showVideoDialog = false; rejectDialog = true">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Approve Dialog -->
    <v-dialog v-model="approveDialog" max-width="500">
      <v-card>
        <v-card-title>Approve Video</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <p class="mb-4">You are about to approve <strong>{{ selectedVideo?.title }}</strong>.</p>
          
          <v-combobox
            v-model="selectedTags"
            :items="availableTags"
            item-title="name"
            item-value="name"
            label="Add Tags"
            multiple
            chips
            closable-chips
            variant="outlined"
            hint="Select existing tags or type to create new ones"
            persistent-hint
            :return-object="false"
          ></v-combobox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="approveDialog = false">Cancel</v-btn>
          <v-btn color="success" @click="confirmApprove">Approve & Publish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject Dialog -->
    <v-dialog v-model="rejectDialog" max-width="500">
      <v-card>
        <v-card-title>Reject Video</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <p class="mb-4">Enter a reason for rejection:</p>
          <v-textarea
            v-model="rejectionReason"
            label="Rejection Reason"
            variant="outlined"
            rows="4"
            required
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="rejectVideo(selectedVideo.id)">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useUiStore } from '@/store/ui';

const uiStore = useUiStore();
const tab = ref('videos');
const pendingVideos = ref([]);
const flags = ref([]);
const showVideoDialog = ref(false);
const rejectDialog = ref(false);
const approveDialog = ref(false);
const selectedVideo = ref(null);
const rejectionReason = ref('');
const availableTags = ref([]);
const selectedTags = ref([]);

const fetchQueue = async () => {
  try {
    const response = await axios.get('/api/v1/moderation/queue');
    pendingVideos.value = response.data.map(v => ({
      ...v,
      uploader_name: v.uploader_name || 'Unknown'
    }));
  } catch (error) {
    console.error('Error fetching queue:', error);
  }
};

const fetchFlags = async () => {
  try {
    const response = await axios.get('/api/v1/moderation/flags');
    flags.value = response.data;
  } catch (error) {
    console.error('Error fetching flags:', error);
  }
};

const fetchTags = async () => {
  try {
    const response = await axios.get('/api/v1/admin/tags');
    availableTags.value = response.data;
  } catch (error) {
    console.error('Error fetching tags:', error);
  }
};

const openApproveDialog = (video) => {
  selectedVideo.value = video;
  selectedTags.value = [];
  approveDialog.value = true;
};

const confirmApprove = async () => {
  if (!selectedVideo.value) return;
  
  try {
    await axios.post(`/api/v1/moderation/approve/${selectedVideo.value.id}`, {
      tags: selectedTags.value
    });
    uiStore.showSuccess('Video approved and published!');
    approveDialog.value = false;
    showVideoDialog.value = false;
    fetchQueue();
  } catch (error) {
    console.error('Error approving video:', error);
    uiStore.showError('Failed to approve video');
  }
};

const approveVideo = async (videoId) => {
  // Legacy direct approve - redirected to dialog now if called from template
  // But we'll keep it for compatibility if needed, or just remove usage
};

const rejectVideo = async (videoId) => {
  if (!rejectionReason.value.trim()) {
    uiStore.showWarning('Please enter a rejection reason');
    return;
  }

  try {
    await axios.post(`/api/v1/moderation/reject/${videoId}`, { 
      reason: rejectionReason.value 
    });
    uiStore.showSuccess('Video rejected!');
    rejectDialog.value = false;
    rejectionReason.value = '';
    fetchQueue();
  } catch (error) {
    console.error('Error rejecting video:', error);
    uiStore.showError('Failed to reject video');
  }
};

const reviewFlag = async (flag) => {
  selectedVideo.value = flag;
  showVideoDialog.value = true;
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

const formatFileSize = (bytes) => {
  if (!bytes) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDuration = (seconds) => {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
};

const getVideoUrl = (videoPath) => {
  if (!videoPath) return '';
  
  // If it's already a full URL, return it
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }
  
  // If it starts with a slash, it's a path from the server root
  if (videoPath.startsWith('/')) {
    return `http://localhost:5000${videoPath}`;
  }
  
  // Otherwise, assume it's a relative path and prefix with /uploads/
  return `http://localhost:5000/uploads/${videoPath}`;
};

onMounted(() => {
  fetchQueue();
  fetchFlags();
  fetchTags();
});
</script>

<style scoped>
.hover-overlay {
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s;
}

.v-img:hover .hover-overlay {
  opacity: 1;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
