<script lang="ts" setup>
import FreightForm from '../../shared/freight-form.vue';

defineEmits<{ success: [] }>();
</script>

<template>
  <FreightForm mode="sea" @success="$emit('success')" />
</template>
