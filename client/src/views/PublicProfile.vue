<template>
  <v-container>
    <v-row v-if="user">
      <v-col cols="12" md="4">
        <v-card class="text-center pa-6">
          <v-avatar size="120" color="primary" class="mb-4">
            <v-img v-if="user.avatar_url" :src="user.avatar_url"></v-img>
            <span v-else class="text-h3">{{ user.username.charAt(0).toUpperCase() }}</span>
          </v-avatar>
          <h1 class="text-h4 mb-2">{{ user.username }}</h1>
          <v-chip v-if="user.role === 'creator'" color="primary" class="mb-4">Creator</v-chip>
          
          <p class="text-body-1 mb-6">{{ user.bio || 'No bio provided.' }}</p>

          <div v-if="authStore.isAuthenticated && authStore.user.id !== user.id">
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
        <h2 class="text-h5 mb-4">Videos</h2>
        <v-row v-if="user.videos && user.videos.length > 0">
          <v-col v-for="video in user.videos" :key="video.id" cols="12" sm="6">
            <VideoCard :video="video" />
          </v-col>
        </v-row>
        <v-alert v-else type="info" variant="tonal">
          No public videos available.
        </v-alert>
      </v-col>
    </v-row>
    <v-row v-else-if="loading" justify="center" class="py-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import axios from '@/plugins/axios';
import VideoCard from '@/components/VideoCard.vue';

const route = useRoute();
const authStore = useAuthStore();
const user = ref(null);
const loading = ref(true);
const followLoading = ref(false);

const fetchProfile = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`/users/${route.params.id}`);
    user.value = response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
  } finally {
    loading.value = false;
  }
};

const follow = async () => {
  followLoading.value = true;
  try {
    await axios.post(`/users/${user.value.id}/follow`);
    fetchProfile();
  } catch (error) {
    console.error('Error following user:', error);
  } finally {
    followLoading.value = false;
  }
};

const unfollow = async () => {
  followLoading.value = true;
  try {
    await axios.post(`/users/${user.value.id}/unfollow`);
    fetchProfile();
  } catch (error) {
    console.error('Error unfollowing user:', error);
  } finally {
    followLoading.value = false;
  }
};

onMounted(fetchProfile);
watch(() => route.params.id, fetchProfile);
</script>
