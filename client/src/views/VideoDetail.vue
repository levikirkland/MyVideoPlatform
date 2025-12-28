<template>
  <v-container fluid class="px-md-8">
    <v-row v-if="video">
      <v-col cols="12" md="8">
        <div class="video-player-container">
          <video 
            controls 
            :src="getVideoUrl(video.video_url)" 
            :poster="video.thumbnail_url ? getVideoUrl(video.thumbnail_url) : ''"
            class="video-player-main"
          ></video>
        </div>
        
        <h1 class="text-h5 mt-4 font-weight-bold">{{ video.title }}</h1>
        
        <div class="d-flex align-center gap-2 my-2 flex-wrap">
          <v-chip
            v-if="video.category_name"
            size="small"
            color="secondary"
            variant="flat"
            class="mr-2"
            :to="`/category/${video.category_name.toLowerCase()}`"
          >
            {{ video.category_name }}
          </v-chip>
          <v-chip
            v-for="tag in video.tags"
            :key="tag.id"
            size="small"
            color="primary"
            variant="outlined"
            :to="`/?tag=${tag.name}`"
          >
            {{ tag.name }}
          </v-chip>
          
          <v-text-field
            v-if="isAdmin"
            v-model="newTagName"
            placeholder="Add tag..."
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 150px"
            @keyup.enter="addTag"
            append-inner-icon="mdi-plus"
            @click:append-inner="addTag"
          ></v-text-field>
        </div>

        <div class="d-flex align-center mt-2 flex-wrap gap-2">
          <router-link :to="`/user/${video.uploader_id}`">
            <v-avatar size="40" color="grey-darken-3" class="mr-2 cursor-pointer">
              <span class="text-h6">{{ video.uploader_name?.charAt(0).toUpperCase() }}</span>
            </v-avatar>
          </router-link>
          <div>
            <router-link :to="`/user/${video.uploader_id}`" class="text-subtitle-2 text-decoration-none text-white hover-underline">
              {{ video.uploader_name }}
            </router-link>
            <div class="text-caption text-grey">{{ new Date(video.created_at).toLocaleDateString() }}</div>
          </div>
          
          <v-spacer></v-spacer>
          
          <div class="d-flex align-center">
            <v-btn 
              :prepend-icon="isFavorite ? 'mdi-heart' : 'mdi-heart-outline'" 
              :color="isFavorite ? 'error' : undefined"
              variant="text" 
              @click="toggleFavorite"
              class="mr-2"
            >
              Favorite
            </v-btn>

            <v-btn icon="mdi-thumb-up" variant="text" @click="rate(true)" :color="video.user_rating === 1 ? 'primary' : undefined"></v-btn>
            <span class="mr-2 font-weight-bold">{{ video.likes_count || 0 }}</span>
            
            <v-btn icon="mdi-thumb-down" variant="text" @click="rate(false)" :color="video.user_rating === -1 ? 'error' : undefined"></v-btn>
            <span class="mr-4 text-grey">{{ video.dislikes_count || 0 }}</span>

            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="showFlagDialog = true" prepend-icon="mdi-flag">
                  <v-list-item-title>Report</v-list-item-title>
                </v-list-item>
                <v-list-item @click="showRemovalDialog = true" prepend-icon="mdi-delete-alert">
                  <v-list-item-title>Request Removal</v-list-item-title>
                </v-list-item>
                <v-divider v-if="isAdmin"></v-divider>
                <v-list-item v-if="isAdmin" @click="openEditDialog" prepend-icon="mdi-pencil" color="primary">
                  <v-list-item-title>Edit Video (Admin)</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="canDelete" @click="deleteVideo" prepend-icon="mdi-delete" color="error">
                  <v-list-item-title>Delete Video</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
        
        <v-card class="mt-4 bg-grey-darken-4" flat>
          <v-card-text>
            <p class="text-body-1">{{ video.description || 'No description provided.' }}</p>
          </v-card-text>
        </v-card>

        <div class="mt-6">
          <h3 class="text-h6 mb-4">{{ comments.length }} Comments</h3>
          
          <div v-if="authStore.isAuthenticated" class="d-flex mb-6">
            <v-avatar size="40" color="primary" class="mr-3">
              {{ authStore.user?.username?.charAt(0).toUpperCase() }}
            </v-avatar>
            <v-text-field
              v-model="newComment"
              placeholder="Add a comment..."
              variant="underlined"
              hide-details
              @keyup.enter="postComment"
              append-icon="mdi-send"
              @click:append="postComment"
            ></v-text-field>
          </div>

          <v-list bg-color="transparent">
            <v-list-item v-for="comment in comments" :key="comment.id" class="px-0 mb-4">
              <template v-slot:prepend>
                <v-avatar color="grey-darken-3" class="mr-3">
                  {{ comment.username?.charAt(0).toUpperCase() }}
                </v-avatar>
              </template>
              
              <v-list-item-title class="text-subtitle-2">
                {{ comment.username }} 
                <span class="text-caption text-grey ml-2">{{ new Date(comment.created_at).toLocaleDateString() }}</span>
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-body-1 text-high-emphasis mt-1">
                {{ comment.content }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn 
                  v-if="authStore.user && (authStore.user.id === comment.user_id || ['admin', 'moderator'].includes(authStore.user.role))"
                  icon="mdi-delete" 
                  size="small" 
                  variant="text" 
                  color="grey"
                  @click="deleteComment(comment.id)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-col>
      
      <v-col cols="12" md="4">
        <!-- Sidebar for related videos could go here -->
      </v-col>
    </v-row>

    <!-- Flag Dialog -->
    <v-dialog v-model="showFlagDialog" max-width="500">
      <v-card>
        <v-card-title>Report Video</v-card-title>
        <v-card-text>
          <v-select
            v-model="flagReason"
            :items="['illegal', 'harmful', 'copyright', 'spam', 'misuse', 'other']"
            label="Reason"
          ></v-select>
          <v-textarea v-model="flagDescription" label="Details"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showFlagDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitFlag">Submit Report</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Removal Request Dialog -->
    <v-dialog v-model="showRemovalDialog" max-width="500">
      <v-card>
        <v-card-title>Request Video Removal</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Please provide a valid reason for requesting the removal of this video.
          </p>
          <v-select
            v-model="removalReason"
            :items="['copyright', 'privacy', 'defamation', 'other']"
            label="Reason"
          ></v-select>
          <v-textarea v-model="removalDescription" label="Details"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRemovalDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="submitRemovalRequest">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Admin Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600">
      <v-card>
        <v-card-title>Edit Video Details (Admin)</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editForm.title"
            label="Title"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-select
            v-model="editForm.category_id"
            :items="categories"
            item-title="name"
            item-value="id"
            label="Collection / Category"
            variant="outlined"
            class="mb-4"
          ></v-select>
          <v-textarea
            v-model="editForm.description"
            label="Description"
            variant="outlined"
            rows="5"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveVideoEdits">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const video = ref(null);
const comments = ref([]);
const newComment = ref('');
const isFavorite = ref(false);
const showFlagDialog = ref(false);
const showRemovalDialog = ref(false);
const flagReason = ref('');
const flagDescription = ref('');
const removalReason = ref('');
const removalDescription = ref('');

const isAdmin = computed(() => authStore.user?.role === 'admin');

const canDelete = computed(() => {
  if (!video.value || !authStore.user) return false;
  return authStore.user.id === video.value.uploader_id || ['admin', 'moderator'].includes(authStore.user.role);
});

const showEditDialog = ref(false);
const editForm = ref({
  title: '',
  description: '',
  category_id: null
});

const categories = ref([]);
const fetchCategories = async () => {
  try {
    const res = await axios.get('/videos/categories');
    categories.value = res.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const openEditDialog = () => {
  editForm.value = {
    title: video.value.title,
    description: video.value.description,
    category_id: video.value.category_id
  };
  if (categories.value.length === 0) fetchCategories();
  showEditDialog.value = true;
};

const saveVideoEdits = async () => {
  try {
    const res = await axios.put(`/admin/videos/${video.value.id}`, editForm.value);
    video.value.title = res.data.title;
    video.value.description = res.data.description;
    video.value.category_id = res.data.category_id;
    // Refresh to get category name
    await fetchVideo();
    showEditDialog.value = false;
    uiStore.showSuccess('Video updated successfully');
  } catch (error) {
    console.error('Error updating video:', error);
    uiStore.showError('Failed to update video');
  }
};

const newTagName = ref('');
const addTag = async () => {
  if (!newTagName.value.trim()) return;
  try {
    await axios.post(`/admin/videos/${video.value.id}/tags`, { tagName: newTagName.value });
    await fetchVideo();
    newTagName.value = '';
    uiStore.showSuccess('Tag added successfully');
  } catch (error) {
    console.error('Error adding tag:', error);
    uiStore.showError('Failed to add tag');
  }
};

const getVideoUrl = (videoPath) => {
  if (!videoPath) return '';
  if (videoPath.startsWith('http')) return videoPath;
  return `http://localhost:5000${videoPath.startsWith('/') ? '' : '/'}${videoPath}`;
};

const fetchVideo = async () => {
  try {
    const res = await axios.get(`/videos/${route.params.id}`);
    video.value = res.data;
    
    if (authStore.isAuthenticated) {
      // Record history
      await axios.post(`/videos/${route.params.id}/history`);
      
      // Set favorite and rating status from response
      isFavorite.value = video.value.is_favorited;
      // user_rating is true (like), false (dislike), or null
      if (video.value.user_rating === true) video.value.user_rating = 1;
      else if (video.value.user_rating === false) video.value.user_rating = -1;
    }
  } catch (error) {
    console.error('Error fetching video:', error);
    uiStore.showError('Error fetching video details');
  }
};

const fetchComments = async () => {
  try {
    const res = await axios.get(`/videos/${route.params.id}/comments`);
    comments.value = res.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
};

const rate = async (isLike) => {
  if (!authStore.isAuthenticated) return uiStore.showError('Please login to rate');
  try {
    const rating = isLike ? 1 : -1;
    const res = await axios.post(`/videos/${route.params.id}/rate`, { rating });
    video.value.likes_count = res.data.likes;
    video.value.dislikes_count = res.data.dislikes;
    
    // Update local rating status
    if (video.value.user_rating === rating) {
      video.value.user_rating = null; // Toggled off
    } else {
      video.value.user_rating = rating;
    }
  } catch (error) {
    uiStore.showError(error.response?.data?.message || 'Error rating video');
  }
};

const toggleFavorite = async () => {
  if (!authStore.isAuthenticated) return uiStore.showError('Please login');
  try {
    const res = await axios.post(`/videos/${route.params.id}/favorite`);
    isFavorite.value = res.data.isFavorite;
    uiStore.showSuccess(isFavorite.value ? 'Added to favorites' : 'Removed from favorites');
  } catch (error) {
    console.error(error);
  }
};

const postComment = async () => {
  if (!newComment.value.trim()) return;
  if (!authStore.isAuthenticated) return uiStore.showError('Please login to comment');
  
  try {
    await axios.post(`/videos/${route.params.id}/comments`, { content: newComment.value });
    newComment.value = '';
    fetchComments();
  } catch (error) {
    uiStore.showError(error.response?.data?.message || 'Error posting comment');
  }
};

const deleteComment = async (commentId) => {
  const confirmed = await uiStore.confirm('Are you sure you want to delete this comment?', 'Delete Comment');
  if (!confirmed) return;
  try {
    await axios.delete(`/videos/comments/${commentId}`);
    fetchComments();
  } catch (error) {
    console.error(error);
  }
};

const deleteVideo = async () => {
  const confirmed = await uiStore.confirm('Delete video? This cannot be undone.', 'Delete Video');
  if (!confirmed) return;
  try {
    await axios.delete(`/videos/${route.params.id}`);
    router.push('/');
    uiStore.showSuccess('Video deleted');
  } catch (error) {
    uiStore.showError('Error deleting video');
  }
};

const submitFlag = async () => {
  try {
    await axios.post(`/videos/${route.params.id}/flag`, {
      reason: flagReason.value,
      description: flagDescription.value
    });
    showFlagDialog.value = false;
    uiStore.showSuccess('Report submitted');
  } catch (error) {
    console.error(error);
  }
};

const submitRemovalRequest = async () => {
  try {
    await axios.post(`/videos/${route.params.id}/removal-request`, {
      reason: removalReason.value,
      description: removalDescription.value
    });
    showRemovalDialog.value = false;
    uiStore.showSuccess('Removal request submitted');
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  fetchVideo();
  fetchComments();
});
</script>
