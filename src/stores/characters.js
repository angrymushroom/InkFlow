import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getCharacters,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  getCharacterRelationships,
  addCharacterRelationship,
  updateCharacterRelationship,
  deleteCharacterRelationship,
} from '@/db/index.js'
import { useStoryStore } from './story.js'

export const useCharactersStore = defineStore('characters', () => {
  const characters = ref([])
  const relationships = ref([])

  async function load() {
    const storyStore = useStoryStore()
    const storyId = storyStore.activeStoryId
    if (!storyId) {
      characters.value = []
      relationships.value = []
      return
    }
    characters.value = await getCharacters(storyId)
    relationships.value = await getCharacterRelationships(storyId)
  }

  async function addCharacterAction(data) {
    await addCharacter(data)
    await load()
  }

  async function updateCharacterAction(id, data) {
    await updateCharacter(id, data)
    await load()
  }

  async function deleteCharacterAction(id) {
    await deleteCharacter(id)
    await load()
  }

  async function addRelationshipAction(data) {
    await addCharacterRelationship(data)
    await load()
  }

  async function updateRelationshipAction(id, data) {
    await updateCharacterRelationship(id, data)
    await load()
  }

  async function deleteRelationshipAction(id) {
    await deleteCharacterRelationship(id)
    await load()
  }

  return {
    characters,
    relationships,
    load,
    addCharacterAction,
    updateCharacterAction,
    deleteCharacterAction,
    addRelationshipAction,
    updateRelationshipAction,
    deleteRelationshipAction,
  }
})
