import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',timeout:180000,workers:1,reporter:[['list'],['html',{outputFolder:'artifacts/playwright-report',open:'never'}]],outputDir:'artifacts/playwright-results'});
