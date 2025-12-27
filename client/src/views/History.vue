<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-8">
      <h1 class="text-h4 font-weight-bold">Watch History</h1>
      <v-btn v-if="history.length > 0" variant="text" color="error" prepend-icon="mdi-delete-sweep" @click="clearAllHistory">
        Clear all watch history
      </v-btn>
    </div>

    <div v-if="history.length === 0" class="text-center py-12">
      <v-icon size="64" color="grey" class="mb-4">mdi-history</v-icon>
      <p class="text-h6 text-grey">No history yet</p>
      <v-btn to="/" color="primary" class="mt-4">Browse Videos</v-btn>
    </div>

    <div v-else class="history-list">
      <div v-for="video in history" :key="video.id" class="history-item mb-6">
        <v-row no-gutters>
          <!-- Thumbnail -->
          <v-col cols="auto">
            <v-card class="cursor-pointer position-relative" @click="goToVideo(video.id)" flat width="160">
              <v-img
                :src="video.thumbnail_url ? getVideoUrl(video.thumbnail_url) : ''"
                aspect-ratio="16/9"
                class="bg-grey-darken-4 rounded-lg"
                cover
              >
                <div class="position-absolute bottom-0 right-0 ma-2 px-1 bg-black rounded text-caption font-weight-bold" style="opacity: 0.8">
                  {{ formatDuration(video.duration_seconds) }}
                </div>
              </v-img>
            </v-card>
          </v-col>

          <!-- Details -->
          <v-col class="pl-4 pt-2 pt-sm-0">
            <div class="d-flex justify-space-between">
              <div class="cursor-pointer" @click="goToVideo(video.id)">
                <h3 class="text-h6 font-weight-bold mb-1 line-clamp-2">{{ video.title }}</h3>
                <div class="d-flex align-center text-caption text-grey mb-2">
                  <span class="font-weight-bold">{{ video.uploader_name }}</span>
                  <v-icon size="14" class="mx-1">mdi-circle-small</v-icon>
                  <span>{{ video.views_count }} views</span>
                  <v-icon size="14" class="mx-1">mdi-circle-small</v-icon>
                  <span>Watched {{ formatDate(video.watched_at) }}</span>
                </div>
                <p class="text-body-2 text-grey line-clamp-2 hidden-xs-only">
                  {{ video.description || 'No description available.' }}
                </p>
              </div>

              <!-- Actions -->
              <v-menu location="bottom end">
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props"></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item @click="removeFromHistory(video.id)" prepend-icon="mdi-delete-outline">
                    <v-list-item-title>Remove from watch history</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="shareVideo(video)" prepend-icon="mdi-share-variant-outline">
                    <v-list-item-title>Share</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-col>
        </v-row>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const router = useRouter();
const uiStore = useUiStore();
const history = ref([]);

const getVideoUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:5000${path.startsWith('/') ? '' : '/'}${path}`;
};

const fetchHistory = async () => {
  try {
    const response = await axios.get('/videos/history');
    history.value = response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
  }
};

const removeFromHistory = async (videoId) => {
  try {
    await axios.delete(`/videos/${videoId}/history`);
    history.value = history.value.filter(v => v.id !== videoId);
    uiStore.showSuccess('Removed from history');
  } catch (error) {
    uiStore.showError('Failed to remove from history');
  }
};

const clearAllHistory = async () => {
  const confirmed = await uiStore.confirm('Are you sure you want to clear your entire watch history?', 'Clear History');
  if (!confirmed) return;

  try {
    // We'll need a backend endpoint for this too, but for now we can loop or just clear the UI
    // Let's assume we'll add a DELETE /videos/history/all endpoint
    await axios.delete('/videos/history/all');
    history.value = [];
    uiStore.showSuccess('Watch history cleared');
  } catch (error) {
    // Fallback if endpoint doesn't exist yet
    console.error('Clear history failed:', error);
    uiStore.showError('Failed to clear history');
  }
};

const goToVideo = (videoId) => {
  router.push(`/video/${videoId}`);
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const shareVideo = (video) => {
  const url = `${window.location.origin}/video/${video.id}`;
  navigator.clipboard.writeText(url);
  uiStore.showSuccess('Link copied to clipboard');
};

onMounted(fetchHistory);
</script>

<style scoped>
.history-item {
  transition: background-color 0.2s;
}
.history-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
