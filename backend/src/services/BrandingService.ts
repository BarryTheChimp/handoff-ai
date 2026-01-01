import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BrandingSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
  customCss: string | null;
}

export interface JiraSettings {
  cloudId: string | null;
  siteUrl: string | null;
  defaultProjectKey: string | null;
  defaultIssueType: string | null;
  customFieldMappings: Record<string, string>;
}

export interface ExportSettings {
  defaultFormat: 'csv' | 'json' | 'markdown';
  includeMetadata: boolean;
  flattenHierarchy: boolean;
  templateId: string | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  branding: BrandingSettings;
  jira: JiraSettings;
  export: ExportSettings;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_BRANDING: BrandingSettings = {
  companyName: 'Handoff AI',
  logoUrl: null,
  primaryColor: '#FF6B35',
  accentColor: '#1A1A2E',
  darkMode: true,
  customCss: null,
};

const DEFAULT_JIRA: JiraSettings = {
  cloudId: null,
  siteUrl: null,
  defaultProjectKey: null,
  defaultIssueType: null,
  customFieldMappings: {},
};

const DEFAULT_EXPORT: ExportSettings = {
  defaultFormat: 'json',
  includeMetadata: true,
  flattenHierarchy: false,
  templateId: null,
};

export class BrandingService {
  async getSettings(userId: string): Promise<{
    branding: BrandingSettings;
    jira: JiraSettings;
    export: ExportSettings;
  }> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        branding: DEFAULT_BRANDING,
        jira: DEFAULT_JIRA,
        export: DEFAULT_EXPORT,
      };
    }

    return {
      branding: (settings.branding as unknown as BrandingSettings) || DEFAULT_BRANDING,
      jira: (settings.jira as unknown as JiraSettings) || DEFAULT_JIRA,
      export: (settings.exportSettings as unknown as ExportSettings) || DEFAULT_EXPORT,
    };
  }

  async updateBranding(userId: string, branding: Partial<BrandingSettings>): Promise<BrandingSettings> {
    const currentSettings = await this.getSettings(userId);
    const updatedBranding = { ...currentSettings.branding, ...branding };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        branding: updatedBranding as any,
        updatedAt: new Date(),
      },
      create: {
        userId,
        branding: updatedBranding as any,
        jira: DEFAULT_JIRA as any,
        exportSettings: DEFAULT_EXPORT as any,
      },
    });

    return updatedBranding;
  }

  async updateJiraSettings(userId: string, jira: Partial<JiraSettings>): Promise<JiraSettings> {
    const currentSettings = await this.getSettings(userId);
    const updatedJira = { ...currentSettings.jira, ...jira };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        jira: updatedJira as any,
        updatedAt: new Date(),
      },
      create: {
        userId,
        branding: DEFAULT_BRANDING as any,
        jira: updatedJira as any,
        exportSettings: DEFAULT_EXPORT as any,
      },
    });

    return updatedJira;
  }

  async updateExportSettings(userId: string, exportSettings: Partial<ExportSettings>): Promise<ExportSettings> {
    const currentSettings = await this.getSettings(userId);
    const updatedExport = { ...currentSettings.export, ...exportSettings };

    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        exportSettings: updatedExport as any,
        updatedAt: new Date(),
      },
      create: {
        userId,
        branding: DEFAULT_BRANDING as any,
        jira: DEFAULT_JIRA as any,
        exportSettings: updatedExport as any,
      },
    });

    return updatedExport;
  }

  async uploadLogo(userId: string, logoData: Buffer, mimeType: string): Promise<string> {
    // For now, store as base64 data URL - in production, upload to S3/CloudStorage
    const base64 = logoData.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    await this.updateBranding(userId, { logoUrl: dataUrl });

    return dataUrl;
  }

  async deleteLogo(userId: string): Promise<void> {
    await this.updateBranding(userId, { logoUrl: null });
  }
}

export const brandingService = new BrandingService();
