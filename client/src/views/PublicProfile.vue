<template>
  <div v-if="user">
    <!-- Creator Banner/Header -->
    <div v-if="isCreator" class="creator-banner">
      <v-img
        :src="user.banner_url || 'https://picsum.photos/1920/300?grayscale'"
        height="200"
        cover
        class="banner-image"
      >
        <div class="banner-overlay d-flex align-end pa-6">
          <v-container>
            <div class="d-flex align-end gap-4">
              <v-avatar size="120" color="primary" class="avatar-bordered">
                <v-img v-if="user.avatar_url" :src="user.avatar_url"></v-img>
                <span v-else class="text-h2">{{ user.username?.charAt(0).toUpperCase() }}</span>
              </v-avatar>
              <div class="pb-2">
                <div class="d-flex align-center gap-2 mb-1">
                  <h1 class="text-h4 font-weight-bold">{{ user.username }}</h1>
                  <v-chip color="primary" size="small" variant="elevated">
                    <v-icon start size="small">mdi-check-decagram</v-icon>
                    Creator
                  </v-chip>
                </div>
                <div class="text-body-2 text-grey-lighten-1">
                  <span>{{ user.follower_count || 0 }} followers</span>
                  <span class="mx-2">•</span>
                  <span>{{ user.videos?.length || 0 }} videos</span>
                  <span class="mx-2">•</span>
                  <span>Joined {{ formatDate(user.created_at) }}</span>
                </div>
              </div>
            </div>
          </v-container>
        </div>
      </v-img>
    </div>

    <v-container :class="{ 'mt-n8': isCreator }">
      <!-- Creator Profile -->
      <template v-if="isCreator">
        <v-row>
          <v-col cols="12">
            <v-card class="mb-6" elevation="2">
              <v-card-text class="pa-6">
                <div class="d-flex justify-space-between align-start flex-wrap gap-4">
                  <div class="flex-grow-1" style="max-width: 800px;">
                    <h2 class="text-h6 mb-3">About</h2>
                    <p class="text-body-1" style="white-space: pre-wrap;">{{ user.bio || 'This creator hasn\'t added a bio yet.' }}</p>
                  </div>
                  <div class="d-flex flex-column gap-2" v-if="authStore.isAuthenticated && authStore.user?.id !== user.id">
                    <v-btn
                      v-if="!user.is_following"
                      color="primary"
                      size="large"
                      @click="follow"
                      :loading="followLoading"
                      prepend-icon="mdi-account-plus"
                    >
                      Follow
                    </v-btn>
                    <v-btn
                      v-else
                      color="secondary"
                      variant="outlined"
                      size="large"
                      @click="unfollow"
                      :loading="followLoading"
                      :prepend-icon="user.follow_status === 'pending' ? 'mdi-clock-outline' : 'mdi-account-check'"
                    >
                      {{ user.follow_status === 'pending' ? 'Requested' : 'Following' }}
                    </v-btn>
                    <v-btn
                      color="secondary"
                      variant="tonal"
                      size="large"
                      @click="openMessageDialog"
                      prepend-icon="mdi-message-text"
                    >
                      Message
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Videos Section -->
        <div class="d-flex align-center justify-space-between mb-4">
          <h2 class="text-h5">Videos</h2>
          <v-btn-toggle v-model="viewMode" mandatory variant="outlined" density="compact">
            <v-btn value="grid" icon="mdi-view-grid"></v-btn>
            <v-btn value="list" icon="mdi-view-list"></v-btn>
          </v-btn-toggle>
        </div>

        <v-row v-if="user.videos && user.videos.length > 0">
          <v-col 
            v-for="video in user.videos" 
            :key="video.id" 
            cols="12" sm="6" md="4" lg="3" xl="2"
          >
            <VideoCard :video="video" @click="$router.push(`/video/${video.id}`)" />
          </v-col>
        </v-row>
        <v-alert v-else type="info" variant="tonal" class="mt-4">
          This creator hasn't uploaded any videos yet.
        </v-alert>
      </template>

      <!-- Regular User Profile (Non-Creator) -->
      <template v-else>
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="text-center pa-6">
              <v-avatar size="100" color="grey-darken-3" class="mb-4">
                <v-img v-if="user.avatar_url" :src="user.avatar_url"></v-img>
                <span v-else class="text-h3">{{ user.username?.charAt(0).toUpperCase() }}</span>
              </v-avatar>
              <h1 class="text-h5 mb-2">{{ user.username }}</h1>
              <p class="text-body-2 text-grey mb-4">Member since {{ formatDate(user.created_at) }}</p>
              <p class="text-body-2 mb-6">{{ user.bio || 'No bio provided.' }}</p>

              <div v-if="authStore.isAuthenticated && authStore.user?.id !== user.id">
                <v-btn
                  v-if="!user.is_following"
                  color="primary"
                  block
                  @click="follow"
                  :loading="followLoading"
                >
                  Follow
                </v-btn>
                <v-btn
                  v-else
                  color="secondary"
                  variant="outlined"
                  block
                  @click="unfollow"
                  :loading="followLoading"
                >
                  {{ user.follow_status === 'pending' ? 'Requested' : 'Following' }}
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <h2 class="text-h6 mb-4">Videos</h2>
            <v-row v-if="user.videos && user.videos.length > 0">
              <v-col v-for="video in user.videos" :key="video.id" cols="12" sm="6" md="4">
                <VideoCard :video="video" @click="$router.push(`/video/${video.id}`)" />
              </v-col>
            </v-row>
            <v-alert v-else type="info" variant="tonal">
              No public videos available.
            </v-alert>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <!-- Message Dialog -->
    <v-dialog v-model="messageDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-message-text</v-icon>
          Message {{ user.username }}
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="messageText"
            label="Your message"
            placeholder="Write a message to this creator..."
            rows="4"
            counter="500"
            maxlength="500"
            variant="outlined"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="messageDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="sendMessage" 
            :loading="sendingMessage"
            :disabled="!messageText.trim()"
          >
            Send
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <v-container v-else-if="loading">
    <v-row justify="center" class="py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </v-row>
  </v-container>

  <v-container v-else>
    <v-alert type="error" variant="tonal">
      User not found.
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import axios from '@/plugins/axios';
import VideoCard from '@/components/VideoCard.vue';

const route = useRoute();
const authStore = useAuthStore();
const uiStore = useUiStore();

const user = ref(null);
const loading = ref(true);
const followLoading = ref(false);
const viewMode = ref('grid');
const messageDialog = ref(false);
const messageText = ref('');
const sendingMessage = ref(false);

const isCreator = computed(() => user.value?.role === 'creator');

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (count) => {
  if (!count) return '0';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
};

const timeAgo = (date) => {
  if (!date) return '';
  const diffDays = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const fetchProfile = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`/users/${route.params.id}`);
    user.value = {
      ...response.data.user,
      videos: response.data.videos,
      is_following: response.data.isFollowing,
      follow_status: response.data.followStatus,
      follower_count: response.data.followerCount || 0
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    user.value = null;
  } finally {
    loading.value = false;
  }
};

const follow = async () => {
  followLoading.value = true;
  try {
    await axios.post(`/users/${user.value.id}/follow`);
    await fetchProfile();
    uiStore.showSuccess('Follow request sent!');
  } catch (error) {
    console.error('Error following user:', error);
    uiStore.showError('Failed to follow user');
  } finally {
    followLoading.value = false;
  }
};

const unfollow = async () => {
  followLoading.value = true;
  try {
    await axios.post(`/users/${user.value.id}/unfollow`);
    await fetchProfile();
  } catch (error) {
    console.error('Error unfollowing user:', error);
    uiStore.showError('Failed to unfollow user');
  } finally {
    followLoading.value = false;
  }
};

const openMessageDialog = () => {
  if (!authStore.isAuthenticated) {
    uiStore.showError('Please log in to send messages');
    return;
  }
  messageText.value = '';
  messageDialog.value = true;
};

const sendMessage = async () => {
  if (!messageText.value.trim()) return;
  
  sendingMessage.value = true;
  try {
    await axios.post(`/users/${user.value.id}/message`, {
      content: messageText.value.trim()
    });
    messageDialog.value = false;
    uiStore.showSuccess('Message sent!');
  } catch (error) {
    console.error('Error sending message:', error);
    uiStore.showError('Failed to send message');
  } finally {
    sendingMessage.value = false;
  }
};

onMounted(fetchProfile);
watch(() => route.params.id, fetchProfile);
</script>

<style scoped>
.creator-banner {
  position: relative;
}

.banner-image {
  position: relative;
}

.banner-overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
}

.avatar-bordered {
  border: 4px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.video-card-compact .thumbnail-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.video-card-compact .duration-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.video-card-compact:hover .thumbnail-container {
  opacity: 0.9;
}

.video-card-row {
  transition: background-color 0.2s;
}

.video-card-row:hover {
  background-color: rgba(255,255,255,0.05);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
