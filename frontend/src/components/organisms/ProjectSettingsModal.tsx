import { useState, useRef } from 'react';
import { Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { projectsApi, type Project } from '../../services/api';
import { toast } from '../../stores/toastStore';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
  project,
  onUpdate,
  onDelete,
}: ProjectSettingsModalProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [jiraProjectKey, setJiraProjectKey] = useState(project.jiraProjectKey || '');
  const [logoUrl, setLogoUrl] = useState(project.logoUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Validation error', 'Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateInput: { name: string; description?: string; jiraProjectKey?: string } = {
        name: name.trim(),
      };
      if (description.trim()) {
        updateInput.description = description.trim();
      }
      if (jiraProjectKey.trim()) {
        updateInput.jiraProjectKey = jiraProjectKey.trim();
      }
      const updated = await projectsApi.update(project.id, updateInput);
      onUpdate({ ...updated, logoUrl });
      toast.success('Project updated', 'Project settings have been saved');
      onClose();
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const result = await projectsApi.uploadLogo(project.id, file);
      setLogoUrl(result.logoUrl);
      toast.success('Logo uploaded', 'Project logo has been updated');
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await projectsApi.deleteLogo(project.id);
      setLogoUrl(null);
      toast.success('Logo removed', 'Project logo has been deleted');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== project.name) {
      return;
    }

    setIsDeleting(true);
    try {
      await projectsApi.delete(project.id);
      toast.success('Project deleted', `"${project.name}" has been permanently deleted`);
      onClose();
      onDelete?.(project.id);
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDeleting(false);
    }
  };

  const logoDisplayUrl = logoUrl ? projectsApi.getLogoUrl(project.id) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Settings">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Section */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Project Logo
          </label>
          <div className="flex items-center gap-4">
            {isUploadingLogo ? (
              <div className="w-16 h-16 rounded-lg bg-toucan-dark border border-toucan-dark-border flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : logoDisplayUrl ? (
              <div className="relative">
                <img
                  src={logoDisplayUrl}
                  alt="Project logo"
                  className="w-16 h-16 object-contain bg-toucan-dark rounded-lg border border-toucan-dark-border"
                />
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  className="absolute -top-2 -right-2 p-1 bg-toucan-error rounded-full text-white hover:bg-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 bg-toucan-dark rounded-lg border border-dashed border-toucan-dark-border flex items-center justify-center">
                <Upload size={20} className="text-toucan-grey-500" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="px-3 py-1.5 text-sm bg-toucan-dark border border-toucan-dark-border rounded-md text-toucan-grey-200 hover:bg-toucan-dark-border disabled:opacity-50"
              >
                {logoDisplayUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              <p className="text-xs text-toucan-grey-500 mt-1">PNG, JPEG, SVG, or WebP. Max 2MB.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
            Project Name <span className="text-toucan-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2
                       text-toucan-grey-100 placeholder-toucan-grey-500
                       focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2
                       text-toucan-grey-100 placeholder-toucan-grey-500
                       focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent
                       resize-none"
            rows={3}
            maxLength={1000}
          />
        </div>

        {/* Jira Project Key */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
            Jira Project Key
          </label>
          <input
            type="text"
            value={jiraProjectKey}
            onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2
                       text-toucan-grey-100 placeholder-toucan-grey-500 uppercase
                       focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
            placeholder="e.g., MOE"
            maxLength={10}
          />
          <p className="text-xs text-toucan-grey-500 mt-1">
            2-10 uppercase letters/numbers
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-toucan-dark-border">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 mt-6 border-t border-toucan-dark-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-toucan-error" />
            <span className="text-sm font-medium text-toucan-error">Danger Zone</span>
          </div>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-2 text-sm text-toucan-error border border-toucan-error/50
                         rounded-md hover:bg-toucan-error/10 transition-colors text-left"
            >
              Delete this project
            </button>
          ) : (
            <div className="bg-toucan-error/10 border border-toucan-error/30 rounded-lg p-4 space-y-3">
              <p className="text-sm text-toucan-grey-200">
                This will permanently delete <strong className="text-toucan-grey-100">{project.name}</strong> and all its specs, work items, and settings. This action cannot be undone.
              </p>
              <div>
                <label className="block text-sm text-toucan-grey-400 mb-1">
                  Type <span className="font-mono text-toucan-grey-200">{project.name}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2
                             text-toucan-grey-100 placeholder-toucan-grey-500
                             focus:outline-none focus:ring-2 focus:ring-toucan-error focus:border-transparent"
                  placeholder={project.name}
                  disabled={isDeleting}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteProject}
                  disabled={deleteConfirmText !== project.name}
                  loading={isDeleting}
                >
                  Delete Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
