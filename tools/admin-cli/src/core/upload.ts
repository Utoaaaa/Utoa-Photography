import { AdminApiClient } from './api';
import { DirectR2Uploader, getDirectR2UploadConfig } from './r2-upload';

export type UploadModePreference = 'auto' | 'direct-r2' | 'admin-api';
export type ResolvedUploadMode = 'direct-r2' | 'admin-api';

export type UploadResult = {
  mode: ResolvedUploadMode;
  message: string;
  variantsGenerated: boolean;
};

export class AssetUploadService {
  private readonly directUploader: DirectR2Uploader | null;
  private readonly missingDirectR2Env: string[];

  constructor(
    private readonly adminClient: AdminApiClient,
    private readonly preference: UploadModePreference
  ) {
    if (preference === 'admin-api') {
      this.directUploader = null;
      this.missingDirectR2Env = [];
      return;
    }

    const config = getDirectR2UploadConfig();
    if (config.ok) {
      this.directUploader = new DirectR2Uploader(config.config);
      this.missingDirectR2Env = [];
      return;
    }

    this.directUploader = null;
    this.missingDirectR2Env = config.missing;

    if (preference === 'direct-r2') {
      throw new Error(
        `Direct R2 upload requested but required env is missing: ${config.missing.join(', ')}`
      );
    }
  }

  describe(): string {
    if (this.directUploader) {
      return this.directUploader.describe();
    }
    if (this.preference === 'auto' && this.missingDirectR2Env.length > 0) {
      return `admin API fallback; missing direct R2 env: ${this.missingDirectR2Env.join(', ')}`;
    }
    return 'admin API';
  }

  async uploadOriginal(filePath: string, imageId: string): Promise<UploadResult> {
    if (this.directUploader) {
      await this.directUploader.uploadOriginalWithVariants(filePath, imageId);
      const variantsGenerated = this.directUploader.generatesVariants();
      return {
        mode: 'direct-r2',
        message: variantsGenerated
          ? 'uploaded original and variants directly to R2'
          : 'uploaded original directly to R2; variants skipped',
        variantsGenerated,
      };
    }

    await this.adminClient.uploadOriginal(filePath, imageId);
    return {
      mode: 'admin-api',
      message: 'uploaded original through admin API',
      variantsGenerated: false,
    };
  }
}
