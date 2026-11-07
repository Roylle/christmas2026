import { defineConfig } from 'vite'
export default defineConfig({root:'source',base:'./',publicDir:'../public',build:{outDir:'../dist',emptyOutDir:true,assetsDir:'bundle',target:'es2022',rollupOptions:{input:{vi:'source/index.html',en:'source/en.html'}}}})
