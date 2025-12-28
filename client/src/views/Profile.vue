<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card>
          <v-card-title class="text-h5">
            User Profile
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="updateProfile">
              <v-text-field
                v-model="form.username"
                label="Username"
                variant="outlined"
                class="mb-4"
              ></v-text-field>
              
              <v-text-field
                v-model="form.email"
                label="Email"
                variant="outlined"
                class="mb-4"
                readonly
                hint="Email cannot be changed"
                persistent-hint
              ></v-text-field>

              <v-textarea
                v-model="form.bio"
                label="Bio"
                variant="outlined"
                class="mb-4"
                rows="3"
              ></v-textarea>

              <v-btn type="submit" color="primary" :loading="loading" block class="mb-6">
                Update Profile
              </v-btn>
            </v-form>

            <v-divider class="my-6"></v-divider>

            <div class="mb-6">
              <h3 class="text-h6 mb-4">Membership</h3>
              <v-alert :type="membershipStore.isActive ? 'success' : 'warning'" variant="tonal" class="mb-3">
                {{ membershipStatusCopy }}
              </v-alert>
              <v-btn to="/membership" variant="outlined" color="primary" prepend-icon="mdi-badge-account">
                Manage Membership
              </v-btn>
            </div>

            <v-divider class="my-6"></v-divider>

            <div v-if="authStore.user?.role === 'user'">
              <h3 class="text-h6 mb-4">Become a Creator</h3>
              <p class="text-body-2 mb-4">
                Creators can upload private videos, manage followers, and have a dedicated profile page.
                To apply, please upload a photo of your ID for verification.
              </p>
              <v-file-input
                v-model="idPhoto"
                label="ID Photo Verification"
                accept="image/*"
                variant="outlined"
                prepend-icon="mdi-camera"
                class="mb-4"
              ></v-file-input>
              <v-btn 
                color="secondary" 
                @click="requestCreator" 
                :loading="requesting"
                :disabled="!idPhoto"
                block
              >
                Submit Creator Request
              </v-btn>
            </div>
            <div v-else-if="authStore.user?.role === 'creator'">
              <v-alert type="success" variant="tonal">
                You are a verified Creator!
              </v-alert>
              <v-btn to="/creator/dashboard" color="primary" block class="mt-4">
                Go to Creator Dashboard
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import axios from '@/plugins/axios';
import { useMembershipStore } from '@/store/membership';

const authStore = useAuthStore();
const uiStore = useUiStore();
const membershipStore = useMembershipStore();
const loading = ref(false);
const requesting = ref(false);
const idPhoto = ref(null);

const form = ref({
  username: '',
  email: '',
  bio: ''
});

onMounted(() => {
  if (authStore.user) {
    form.value.username = authStore.user.username;
    form.value.email = authStore.user.email;
    form.value.bio = authStore.user.bio || '';
  }
  if (authStore.isAuthenticated) {
    membershipStore.fetchStatus();
  }
});

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const membershipStatusCopy = computed(() =>
  membershipStore.isActive
    ? `Active through ${formatDate(membershipStore.membership?.end_date)}`
    : 'No active membership on file.'
);

const updateProfile = async () => {
  loading.value = true;
  try {
    await axios.put('/users/profile', { 
      username: form.value.username,
      bio: form.value.bio
    });
    // Update local store
    authStore.user.username = form.value.username;
    authStore.user.bio = form.value.bio;
    localStorage.setItem('user', JSON.stringify(authStore.user));
    
    uiStore.showSuccess('Profile updated successfully');
  } catch (error) {
    uiStore.showError('Failed to update profile');
  } finally {
    loading.value = false;
  }
};

const requestCreator = async () => {
  requesting.value = true;
  try {
    // In a real app, we'd upload the file to S3/Cloudinary first
    // For now, we'll just send a mock URL or handle it in the backend if it supports multipart
    // Since our backend requestCreatorStatus expects id_photo_url, let's simulate
    const mockUrl = 'https://via.placeholder.com/800x600?text=ID+Photo';
    await axios.post('/users/creator-request', { id_photo_url: mockUrl });
    uiStore.showSuccess('Creator request submitted! An admin will review it.');
  } catch (error) {
    uiStore.showError('Failed to submit request');
  } finally {
    requesting.value = false;
  }
};
</script>
