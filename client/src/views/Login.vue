<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="8" md="5">
        <v-card class="elevation-8 rounded-lg">
          <v-card-item class="bg-primary text-white text-center py-8">
            <v-icon size="48" class="mb-2">mdi-play-circle</v-icon>
            <v-card-title class="text-h5">Welcome Back</v-card-title>
            <v-card-subtitle class="text-white-50">Sign in to your account</v-card-subtitle>
          </v-card-item>
          <v-card-text class="pt-8">
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Email Address"
                type="email"
                prepend-inner-icon="mdi-email"
                variant="filled"
                required
                class="mb-6"
              ></v-text-field>
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                prepend-inner-icon="mdi-lock"
                variant="filled"
                required
                class="mb-6"
              ></v-text-field>
              <v-btn type="submit" color="primary" block size="large" :loading="loading" class="mb-4">
                Sign In
              </v-btn>
            </v-form>
            <v-divider class="my-4"></v-divider>
            <div class="text-center">
              <span class="text-grey">Don't have an account?</span>
              <router-link to="/register" class="text-primary font-weight-bold">Sign up here</router-link>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/store/ui';

const email = ref('');
const password = ref('');
const loading = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const uiStore = useUiStore();

const handleLogin = async () => {
  loading.value = true;
  const success = await authStore.login(email.value, password.value);
  loading.value = false;
  if (success) {
    if (authStore.isAdmin) {
      router.push('/admin/dashboard');
    } else {
      router.push('/');
    }
  } else {
    uiStore.showError('Invalid credentials');
  }
};
</script>

<style scoped>
.elevation-8 {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.rounded-lg {
  border-radius: 12px;
}
</style>
