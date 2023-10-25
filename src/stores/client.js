import { defineStore } from 'pinia'

export const useClientStore = defineStore('client', {
    state: () => ({
        client_id: ''
    })
});
