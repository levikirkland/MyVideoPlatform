<template>
  <v-container fluid class="py-8">
    <v-breadcrumbs :items="[
      { title: 'Admin', disabled: false, to: '/admin/dashboard' },
      { title: 'Categories', disabled: true }
    ]" class="px-0 mb-4"></v-breadcrumbs>
    <div class="mb-6">
      <h1 class="text-h3 font-weight-bold">Manage Categories</h1>
      <p class="text-grey">Add, edit, and manage content categories</p>
    </div>

    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="4">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showDialog = true" block>
          Add Category
        </v-btn>
      </v-col>
    </v-row>

    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="category in categories" :key="category.id">
          <td>{{ category.name }}</td>
          <td>{{ category.slug }}</td>
          <td>
            <v-chip :color="category.is_active ? 'success' : 'error'" size="small">
              {{ category.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </td>
          <td>
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="editCategory(category)"></v-btn>
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteCategory(category.id)"></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingId ? 'Edit Category' : 'Add Category' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Name" variant="outlined" class="mb-4"></v-text-field>
          <v-text-field v-model="form.slug" label="Slug" variant="outlined" class="mb-4"></v-text-field>
          <v-textarea v-model="form.description" label="Description" variant="outlined"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveCategory">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const categories = ref([]);
const showDialog = ref(false);
const editingId = ref(null);
const uiStore = useUiStore();
const form = ref({
  name: '',
  slug: '',
  description: ''
});

const fetchCategories = async () => {
  try {
    const res = await axios.get('/admin/categories');
    categories.value = res.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const editCategory = (category) => {
  editingId.value = category.id;
  form.value = { name: category.name, slug: category.slug, description: category.description };
  showDialog.value = true;
};

const saveCategory = async () => {
  try {
    if (editingId.value) {
      await axios.put(`/admin/categories/${editingId.value}`, form.value);
    } else {
      await axios.post('/admin/categories', form.value);
    }
    showDialog.value = false;
    resetForm();
    fetchCategories();
  } catch (error) {
    console.error('Error saving category:', error);
  }
};

const deleteCategory = async (id) => {
  const confirmed = await uiStore.confirm('Are you sure you want to delete this category?', 'Delete Category');
  if (!confirmed) return;
  try {
    await axios.delete(`/admin/categories/${id}`);
    fetchCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
  }
};

const resetForm = () => {
  editingId.value = null;
  form.value = { name: '', slug: '', description: '' };
};

onMounted(fetchCategories);
</script>
