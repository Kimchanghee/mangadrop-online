#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { BaseStaticSiteStack } from '../../../shared/infrastructure/BaseStack';

const app = new App();

new BaseStaticSiteStack(app, 'MangaDropStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  domain: 'mangadrop.online',
  buildOutputDir: '../dist',
  languages: ['ko', 'en', 'ja'],
  description: 'MangaDrop — Manga & webtoon release calendar',
});

app.synth();
