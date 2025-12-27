<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <h2 class="text-h5 font-weight-bold">
          {{ community ? 'Community Grid' : (route.params.category ? 'Category: ' + route.params.category : (route.query.tag ? 'Tag: ' + route.query.tag : 'Recommended')) }}
        </h2>
        <v-btn v-if="route.params.category || route.query.tag || community" icon="mdi-close" size="x-small" variant="text" to="/"></v-btn>
      </div>
      <v-select
        v-model="sortBy"
        :items="['newest', 'popular', 'trending']"
        label="Sort by"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 150px"
      ></v-select>
    </div>

    <v-row v-if="filteredVideos.length > 0" dense>
      <v-col v-for="video in filteredVideos" :key="video.id" cols="12" sm="6" md="4" lg="3" xl="2">
        <VideoCard :video="video" @click="$router.push('/video/' + video.id)" />
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12" class="text-center py-8">
        <v-icon size="64" color="grey-300" class="mb-4">mdi-folder-open-outline</v-icon>
        <p class="text-h6 text-grey">No videos found</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';
import { useRoute } from 'vue-router';
import VideoCard from '@/components/VideoCard.vue';

const props = defineProps({
  sort: {
    type: String,
    default: 'newest'
  },
  community: {
    type: Boolean,
    default: false
  }
});

const videos = ref([]);
const sortBy = ref(props.sort);
const uiStore = useUiStore();
const route = useRoute();

// Watch for prop changes (e.g. navigation from /new to /trending)
watch(() => props.sort, (newSort) => {
  sortBy.value = newSort;
  fetchVideos();
});

// Watch for community prop changes
watch(() => props.community, () => {
  fetchVideos();
});

// Watch for selector changes
watch(sortBy, () => {
  fetchVideos();
});

// Watch for category changes
watch(() => route.params.category, () => {
  fetchVideos();
});

// Watch for tag changes
watch(() => route.query.tag, () => {
  fetchVideos();
});

const fetchVideos = async () => {
  try {
    if (props.community) {
      const response = await axios.get('/videos/community');
      videos.value = response.data;
      return;
    }

    const params = {
      sort: sortBy.value,
      category: route.params.category,
      tag: route.query.tag
    };
    const response = await axios.get('/videos', { params });
    videos.value = response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
  }
};

const filteredVideos = computed(() => {
  let filtered = videos.value;
  
  // Filter by search query (client-side for responsiveness)
  if (uiStore.searchQuery) {
    filtered = filtered.filter(v => 
      v.title.toLowerCase().includes(uiStore.searchQuery.toLowerCase())
    );
  }

  return filtered;
});

onMounted(fetchVideos);
</script>

