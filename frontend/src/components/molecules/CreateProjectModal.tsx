import { useState } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { projectsApi, type Project } from '../../services/api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const descValue = description.trim();
      const jiraValue = jiraProjectKey.trim().toUpperCase();
      const project = await projectsApi.create({
        name: name.trim(),
        ...(descValue ? { description: descValue } : {}),
        ...(jiraValue ? { jiraProjectKey: jiraValue } : {}),
      });
      onCreate(project);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setJiraProjectKey('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-toucan-error/20 border border-toucan-error rounded-md text-sm text-toucan-error">
            {error}
          </div>
        )}

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
              placeholder="e.g., Moorfields OpenEyes"
              maxLength={100}
              autoFocus
            />
          </div>

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
              placeholder="Brief description of the project"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Jira Project Key
            </label>
            <input
              type="text"
              value={jiraProjectKey}
              onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2
                         text-toucan-grey-100 placeholder-toucan-grey-500
                         focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent
                         uppercase"
              placeholder="e.g., MOE"
              maxLength={10}
            />
            <p className="text-xs text-toucan-grey-500 mt-1">
              2-10 uppercase letters/numbers
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Create Project
            </Button>
          </div>
        </form>
    </Modal>
  );
}
