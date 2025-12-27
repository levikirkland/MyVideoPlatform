<template>
  <v-container fluid class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <div class="mb-8">
          <h1 class="text-h3 font-weight-bold">Upload Video</h1>
          <p class="text-grey text-subtitle-1">Share your content with our community</p>
        </div>

        <v-card class="elevation-4 rounded-lg">
          <v-card-text class="pt-8">
            <v-form @submit.prevent="handleUpload">
              <div class="mb-6">
                <label class="text-subtitle-2 font-weight-bold mb-2">Video File</label>
                <v-file-input
                  v-model="file"
                  accept="video/*"
                  prepend-icon="mdi-video"
                  variant="outlined"
                  required
                  show-size
                  label="Choose a video file"
                ></v-file-input>
              </div>

              <v-text-field
                v-model="title"
                label="Video Title"
                prepend-inner-icon="mdi-text"
                variant="outlined"
                required
                class="mb-4"
              ></v-text-field>

              <v-select
                v-model="categoryId"
                :items="categories"
                item-title="name"
                item-value="id"
                label="Collection / Category"
                prepend-inner-icon="mdi-shape"
                variant="outlined"
                class="mb-4"
              ></v-select>

              <v-textarea
                v-model="description"
                label="Description (optional)"
                prepend-icon="mdi-pencil"
                variant="outlined"
                rows="5"
                class="mb-4"
              ></v-textarea>

              <v-switch
                v-model="isPrivate"
                label="Private Video (Followers Only)"
                color="primary"
                inset
                class="mb-2"
                hide-details
              ></v-switch>

              <v-switch
                v-if="authStore.user?.role === 'creator' || authStore.user?.role === 'admin'"
                v-model="isCommunity"
                label="Community Video (Show in Community Grid)"
                color="info"
                inset
                class="mb-6"
                hide-details
              ></v-switch>

              <v-alert type="warning" variant="tonal" class="mb-6">
                <v-icon size="20" class="me-2">mdi-information</v-icon>
                <strong>Important:</strong> All uploads are subject to moderation. By uploading, you confirm that you have the rights to this content and it complies with our Terms of Service and community guidelines.
              </v-alert>

              <div class="d-flex gap-3">
                <v-btn type="submit" color="primary" block size="large" :loading="loading" prepend-icon="mdi-cloud-upload">
                  Upload Video
                </v-btn>
                <v-btn to="/" color="secondary" block size="large" variant="outlined">
                  Cancel
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useRouter, useRoute } from 'vue-router';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';

const file = ref(null);
const title = ref('');
const description = ref('');
const categoryId = ref(null);
const isPrivate = ref(false);
const isCommunity = ref(false);
const categories = ref([]);
const loading = ref(false);
const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();
const authStore = useAuthStore();

onMounted(() => {
  fetchCategories();
  if (route.query.community === 'true') {
    isCommunity.value = true;
  }
});

const fetchCategories = async () => {
  try {
    const res = await axios.get('/videos/categories');
    categories.value = res.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const handleUpload = async () => {
  console.log('File value:', file.value);
  console.log('Title:', title.value);
  
  if (!file.value) {
    uiStore.showWarning('Please select a video file');
    return;
  }

  if (!title.value.trim()) {
    uiStore.showWarning('Please enter a title');
    return;
  }

  loading.value = true;
  const formData = new FormData();
  
  // Debug: Log what we're appending
  const videoFile = file.value;
  console.log('Video file details:', {
    name: videoFile.name,
    size: videoFile.size,
    type: videoFile.type
  });
  
  formData.append('video', videoFile);
  formData.append('title', title.value);
  formData.append('description', description.value || '');
  formData.append('is_private', isPrivate.value);
  formData.append('is_community', isCommunity.value);
  if (categoryId.value) {
    formData.append('category_id', categoryId.value);
  }

  try {
    const response = await axios.post('/videos/upload', formData);
    console.log('Upload response:', response.data);
    uiStore.showSuccess('Upload successful! Your video is pending approval.');
    router.push('/');
  } catch (error) {
    console.error('Upload failed:', error);
    console.error('Error response:', error.response?.data);
    const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
    uiStore.showError(`Upload failed: ${errorMessage}`);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.rounded-lg {
  border-radius: 12px;
}

.elevation-4 {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
</style>
