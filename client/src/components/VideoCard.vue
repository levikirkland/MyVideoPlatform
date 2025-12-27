<template>
  <div class="video-card" @click="$emit('click')">
    <div class="video-thumbnail-container">
      <img 
        v-if="video.thumbnail_url && !imageError" 
        :src="video.thumbnail_url" 
        class="video-thumbnail" 
        loading="lazy"
        @error="imageError = true"
      />
      <div v-else class="no-thumbnail-placeholder">
        <v-icon size="48" color="grey-darken-1">mdi-play-circle-outline</v-icon>
      </div>
      
      <div class="play-overlay">
        <v-icon size="48" color="white">mdi-play-circle</v-icon>
      </div>
      
      <div class="duration-badge">
        {{ formatDuration(video.duration_seconds) }}
      </div>
    </div>
    
    <div class="d-flex gap-3 mt-3 px-1">
      <v-avatar size="36" color="grey-darken-3" class="flex-shrink-0">
        <span class="text-subtitle-2">{{ video.uploader_name?.charAt(0).toUpperCase() }}</span>
      </v-avatar>
      <div class="flex-grow-1 overflow-hidden">
        <h3 class="text-subtitle-2 font-weight-bold mb-1 line-clamp-2" :title="video.title">
          {{ video.title }}
        </h3>
        <div class="text-caption text-grey-lighten-1">
          <div class="mb-1">{{ video.uploader_name }}</div>
          <div class="d-flex align-center">
            <span>{{ formatViews(video.views_count) }} views</span>
            <span class="mx-1">•</span>
            <span>{{ timeAgo(video.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  video: {
    type: Object,
    required: true
  }
});

const imageError = ref(false);

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (count) => {
  if (!count) return '0';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
};

const timeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} months ago`;
  
  return `${Math.floor(diffMonths / 12)} years ago`;
};
</script>
