<template>
  <v-container fluid class="py-8">
    <v-breadcrumbs :items="[
      { title: 'Admin', disabled: false, to: '/admin/dashboard' },
      { title: 'Tags', disabled: true }
    ]" class="px-0 mb-4"></v-breadcrumbs>
    <div class="mb-6">
      <h1 class="text-h3 font-weight-bold">Manage Tags</h1>
      <p class="text-grey">Add, edit, and manage content tags</p>
    </div>

    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="4">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showDialog = true" block>
          Add Tag
        </v-btn>
      </v-col>
    </v-row>

    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Created By</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in tags" :key="tag.id">
          <td>{{ tag.name }}</td>
          <td>
            <v-chip :color="tag.is_approved ? 'success' : 'warning'" size="small">
              {{ tag.is_approved ? 'Approved' : 'Pending' }}
            </v-chip>
          </td>
          <td>{{ tag.creator_name || 'System' }}</td>
          <td>
            <v-btn v-if="!tag.is_approved" icon="mdi-check" size="small" variant="text" color="success" @click="approveTag(tag.id)"></v-btn>
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteTag(tag.id)"></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Add Dialog -->
    <v-dialog v-model="showDialog" max-width="500">
      <v-card>
        <v-card-title>Add Tag</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Tag Name" variant="outlined"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveTag">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';
import { useUiStore } from '@/store/ui';

const tags = ref([]);
const showDialog = ref(false);
const uiStore = useUiStore();
const form = ref({
  name: ''
});

const fetchTags = async () => {
  try {
    const response = await axios.get('/admin/tags');
    tags.value = response.data;
  } catch (error) {
    console.error('Error fetching tags:', error);
  }
};

const saveTag = async () => {
  if (!form.value.name.trim()) return;
  
  try {
    await axios.post('/admin/tags', { name: form.value.name });
    showDialog.value = false;
    form.value = { name: '' };
    fetchTags();
  } catch (error) {
    console.error('Error creating tag:', error);
  }
};

const approveTag = async (tagId) => {
  try {
    await axios.put(`/admin/tags/${tagId}/approve`);
    fetchTags();
  } catch (error) {
    console.error('Error approving tag:', error);
  }
};

const deleteTag = async (tagId) => {
  const confirmed = await uiStore.confirm('Are you sure you want to delete this tag?', 'Delete Tag');
  if (!confirmed) return;
  
  try {
    await axios.delete(`/admin/tags/${tagId}`);
    fetchTags();
  } catch (error) {
    console.error('Error deleting tag:', error);
  }
};

onMounted(fetchTags);
</script>
