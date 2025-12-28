<template>
  <v-container fluid class="py-8">
    <h1 class="text-h3 font-weight-bold mb-8">My Favorites</h1>

    <div v-if="favorites.length === 0" class="text-center py-12">
      <v-icon size="64" color="grey" class="mb-4">mdi-heart-outline</v-icon>
      <p class="text-h6 text-grey">No favorites yet</p>
      <p class="text-body2 text-grey mb-6">Add videos to your favorites to watch them later</p>
      <v-btn to="/" color="primary">Browse Videos</v-btn>
    </div>

    <v-row v-else>
      <v-col v-for="video in favorites" :key="video.id" cols="12" sm="6" md="4" lg="3">
        <v-card class="h-100 cursor-pointer hover-card" @click="goToVideo(video.id)">
          <v-img
            :src="video.thumbnail_url || 'https://via.placeholder.com/400x300?text=No+Thumbnail'"
            aspect-ratio="16/9"
            class="bg-grey-darken-4"
          >
            <div class="d-flex align-center justify-center h-100 hover-overlay">
              <v-icon size="64" color="white">mdi-play-circle</v-icon>
            </div>
          </v-img>

          <v-card-text>
            <h3 class="text-h6 mb-2 line-clamp-2">{{ video.title }}</h3>
            <p class="text-caption text-grey mb-2">{{ video.uploader_name }}</p>
            <div class="d-flex justify-space-between align-center text-caption text-grey">
              <span>{{ formatViews(video.views_count) }} views</span>
              <v-btn icon="mdi-heart" size="small" color="error" @click.stop="removeFavorite(video.id)"></v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

const router = useRouter();
const favorites = ref([]);

const fetchFavorites = async () => {
  try {
    const response = await axios.get('/videos/favorites');
    favorites.value = response.data;
  } catch (error) {
    console.error('Error fetching favorites:', error);
  }
};

const removeFavorite = async (videoId) => {
  try {
    await axios.post(`/videos/${videoId}/favorite`);
    favorites.value = favorites.value.filter(v => v.id !== videoId);
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
};

const goToVideo = (videoId) => {
  router.push(`/video/${videoId}`);
};

const formatViews = (views) => {
  if (views === undefined || views === null) return '0';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
};

onMounted(fetchFavorites);
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.hover-overlay {
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s;
}

.hover-card:hover .hover-overlay {
  opacity: 1;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
