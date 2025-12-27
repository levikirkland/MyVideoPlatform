<template>
  <v-app theme="dark">
    <v-app-bar app color="surface" elevation="1" class="app-header px-4">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      
      <router-link to="/" class="text-decoration-none text-white d-flex align-center gap-2 mr-8">
        <v-icon size="32" color="primary">mdi-play-circle</v-icon>
        <span class="text-h6 font-weight-bold hidden-sm-and-down">VideoPlatform</span>
      </router-link>

      <v-text-field
        v-model="uiStore.searchQuery"
        density="compact"
        variant="solo-filled"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        single-line
        hide-details
        class="mx-4 search-bar"
        style="max-width: 600px;"
        rounded="lg"
      ></v-text-field>

      <v-spacer></v-spacer>
      
      <div class="d-flex align-center gap-2">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" variant="text" prepend-icon="mdi-web">
              {{ currentLang }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="currentLang = 'EN'" value="EN">
              <v-list-item-title>English</v-list-item-title>
            </v-list-item>
            <v-list-item @click="currentLang = 'ES'" value="ES">
              <v-list-item-title>Español</v-list-item-title>
            </v-list-item>
            <v-list-item @click="currentLang = 'FR'" value="FR">
              <v-list-item-title>Français</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <template v-if="authStore.isAuthenticated">
          <v-btn to="/upload" icon="mdi-upload" variant="text" title="Upload"></v-btn>
          
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-avatar v-bind="props" color="primary" size="40" class="cursor-pointer ml-2">
                <span class="text-h6">{{ authStore.user?.username?.charAt(0).toUpperCase() }}</span>
              </v-avatar>
            </template>
            <v-list width="220">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">{{ authStore.user?.username }}</v-list-item-title>
                <v-list-item-subtitle style="font-size: 0.75rem;">{{ authStore.user?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-divider class="my-2"></v-divider>
              
              <v-list-item to="/profile" prepend-icon="mdi-account">
                <v-list-item-title>Profile</v-list-item-title>
              </v-list-item>
              <v-list-item to="/favorites" prepend-icon="mdi-heart">
                <v-list-item-title>Favorites</v-list-item-title>
              </v-list-item>

              <template v-if="authStore.user?.role === 'creator' || (authStore.isAdmin && userVideos.length > 0)">
                <v-divider class="my-2"></v-divider>
                <v-list-subheader class="text-uppercase font-weight-bold text-caption">Creator</v-list-subheader>
                <v-list-item to="/creator/dashboard" prepend-icon="mdi-video-account">
                  <v-list-item-title>Dashboard</v-list-item-title>
                </v-list-item>
              </template>
              
              <template v-if="authStore.isAdmin">
                <v-divider class="my-2"></v-divider>
                <v-list-subheader class="text-uppercase font-weight-bold text-caption">Backoffice</v-list-subheader>
                <v-list-item to="/admin/dashboard" prepend-icon="mdi-view-dashboard">
                  <v-list-item-title>Dashboard</v-list-item-title>
                </v-list-item>
              </template>

              <v-divider class="my-2"></v-divider>
              <v-list-item @click="logout" prepend-icon="mdi-logout" color="error">
                <v-list-item-title>Logout</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <template v-else>
          <v-btn to="/login" variant="text" prepend-icon="mdi-account-circle">Login</v-btn>
          <v-btn to="/register" color="primary" variant="flat">Sign Up</v-btn>
        </template>
      </div>
    </v-app-bar>

    <!-- Permanent Sidebar for Categories -->
    <v-navigation-drawer v-model="drawer" app width="240" class="border-none">
      <v-list nav density="compact">
        <v-list-item to="/" prepend-icon="mdi-home" title="Home" exact></v-list-item>
        <v-list-item v-if="authStore.isAuthenticated" to="/community" prepend-icon="mdi-account-group" title="Community"></v-list-item>
        <v-list-item to="/trending" prepend-icon="mdi-fire" title="Trending"></v-list-item>
        <v-list-item to="/new" prepend-icon="mdi-clock-outline" title="Newest"></v-list-item>
        <v-list-item to="/top-rated" prepend-icon="mdi-thumb-up" title="Top Rated"></v-list-item>
      </v-list>

      <v-divider class="my-2"></v-divider>

      <v-list nav density="compact" v-if="authStore.isAuthenticated">
        <v-list-subheader class="text-uppercase font-weight-bold text-caption">Library</v-list-subheader>
        <v-list-item to="/favorites" prepend-icon="mdi-heart" title="Favorites"></v-list-item>
        <v-list-item to="/history" prepend-icon="mdi-history" title="History"></v-list-item>
        <v-list-item to="/upload" prepend-icon="mdi-upload" title="Upload Video"></v-list-item>
        <v-list-item v-if="['creator', 'admin'].includes(authStore.user?.role)" to="/creator/dashboard" prepend-icon="mdi-video-account" title="Creator Dashboard" color="primary"></v-list-item>
      </v-list>

      <v-divider class="my-2"></v-divider>

      <v-list-subheader class="text-uppercase font-weight-bold text-caption ml-2">Collections</v-list-subheader>
      <v-list nav density="compact">
        <v-list-item v-for="cat in categories" :key="cat.id" :to="'/category/' + cat.slug" :title="cat.name" prepend-icon="mdi-tag-outline"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-background">
      <router-view></router-view>
    </v-main>

    <v-footer app border color="grey-900" class="footer-custom">
      <div class="text-center w-100 py-4">
        <div class="mb-2">
          <strong class="text-white">VideoPlatform</strong>
          <span class="text-grey mx-2">|</span>
          <span class="text-grey" style="font-size: 0.9rem;">{{ new Date().getFullYear() }}</span>
        </div>
        <div class="text-grey" style="font-size: 0.85rem;">
          <router-link to="/terms" class="text-grey">Terms</router-link>
          <span class="mx-2">•</span>
          <router-link to="/privacy" class="text-grey">Privacy</router-link>
          <span class="mx-2">•</span>
          <router-link to="/compliance" class="text-grey">Compliance</router-link>
        </div>
      </div>
    </v-footer>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="uiStore.snackbar.show"
      :color="uiStore.snackbar.color"
      :timeout="uiStore.snackbar.timeout"
      location="top"
    >
      {{ uiStore.snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="uiStore.snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Global Dialog -->
    <v-dialog v-model="uiStore.dialog.show" max-width="500">
      <v-card>
        <v-card-title class="text-h5">{{ uiStore.dialog.title }}</v-card-title>
        <v-card-text>{{ uiStore.dialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn 
            v-if="uiStore.dialog.cancelText" 
            color="grey-darken-1" 
            variant="text" 
            @click="uiStore.dialog.onCancel"
          >
            {{ uiStore.dialog.cancelText }}
          </v-btn>
          <v-btn 
            color="primary" 
            variant="text" 
            @click="uiStore.dialog.onConfirm"
          >
            {{ uiStore.dialog.confirmText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from './store/auth';
import { useUiStore } from './store/ui';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();
const drawer = ref(true); // Default open on desktop
const currentLang = ref('EN');

const categories = ref([]);
const userVideos = ref([]);

const fetchCategories = async () => {
  try {
    const res = await axios.get('/videos/categories');
    categories.value = res.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const fetchUserVideos = async () => {
  if (authStore.isAuthenticated) {
    try {
      const res = await axios.get('/videos/creator/my-videos');
      userVideos.value = res.data;
    } catch (error) {
      console.error('Error fetching user videos:', error);
    }
  }
};

const fetchUserProfile = async () => {
  if (authStore.isAuthenticated) {
    try {
      const res = await axios.get('/users/profile');
      authStore.user = res.data;
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (error.response?.status === 401) {
        authStore.logout();
      }
    }
  }
};

onMounted(() => {
  fetchCategories();
  fetchUserProfile();
  fetchUserVideos();
});

const logout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
/* Styles moved to main.css */
</style>
