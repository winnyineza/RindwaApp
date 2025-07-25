import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckSquare, 
  X, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  TrendingUp,
  FileText,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Incident } from '@/types';

interface BulkOperationsBarProps {
  selectedIncidents: Incident[];
  allIncidents: Incident[];
  onClearSelection: () => void;
  onBulkAction: (action: string, data?: any) => Promise<void>;
  onSelectAll: () => void;
  users?: any[];
}

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data?: any) => Promise<void>;
  action: BulkAction;
  selectedCount: number;
  isLoading: boolean;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  requiresData?: boolean;
  confirmMessage: string;
  successMessage: string;
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  selectedCount,
  isLoading
}) => {
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const { user } = useAuth();

  const handleConfirm = async () => {
    const data: any = {};
    
    if (action.id === 'assign') {
      data.assignedToId = assigneeId;
      data.assignedBy = user?.userId;
    } else if (action.id === 'changePriority') {
      data.priority = priority;
    } else if (action.id === 'changeStatus') {
      data.status = status;
      if (status === 'resolved') {
        data.resolvedBy = user?.userId;
        data.resolvedAt = new Date().toISOString();
        data.resolution = notes;
      }
    } else if (action.id === 'escalate') {
      data.status = 'escalated';
      data.escalatedBy = user?.userId;
      data.escalatedAt = new Date().toISOString();
      data.escalationReason = escalationReason;
    }
    
    if (notes && action.id !== 'changeStatus') {
      data.notes = notes;
    }

    await onConfirm(data);
  };

  const renderActionForm = () => {
    switch (action.id) {
      case 'assign':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignee">Assign to Staff Member</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Assign to myself</SelectItem>
                  {/* Users would be passed as props */}
                  <SelectItem value="user1">John Doe</SelectItem>
                  <SelectItem value="user2">Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Assignment Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any assignment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 'changePriority':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="priority">New Priority Level</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Priority Change Reason (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Explain why priority is being changed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 'changeStatus':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">📋 Assigned</SelectItem>
                  <SelectItem value="in_progress">⚡ In Progress</SelectItem>
                  <SelectItem value="resolved">✅ Resolved</SelectItem>
                  <SelectItem value="closed">🔒 Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'resolved' && (
              <div>
                <Label htmlFor="notes">Resolution Summary *</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe how these incidents were resolved..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
        );

      case 'escalate':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="escalationReason">Escalation Reason *</Label>
              <Textarea
                id="escalationReason"
                placeholder="Explain why these incidents need escalation..."
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isFormValid = () => {
    switch (action.id) {
      case 'assign':
        return !!assigneeId;
      case 'changePriority':
        return !!priority;
      case 'changeStatus':
        return !!status && (status !== 'resolved' || !!notes);
      case 'escalate':
        return !!escalationReason;
      default:
        return true;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div style={{ color: action.color }}>
              {action.icon}
            </div>
            {action.label}
          </DialogTitle>
          <DialogDescription>
            {action.confirmMessage.replace('{count}', selectedCount.toString())}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Progress value={66} className="w-full" />
            <p className="text-sm text-center text-gray-600">
              Processing {selectedCount} incidents...
            </p>
          </div>
        ) : (
          renderActionForm()
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isFormValid() || isLoading}
            style={{ backgroundColor: action.color }}
            className="text-white"
          >
            {isLoading ? 'Processing...' : `Confirm ${action.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const BulkOperationsBar: React.FC<BulkOperationsBarProps> = ({
  selectedIncidents,
  allIncidents,
  onClearSelection,
  onBulkAction,
  onSelectAll,
  users = []
}) => {
  const [showModal, setShowModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const bulkActions: BulkAction[] = [
    {
      id: 'assign',
      label: 'Assign',
      icon: <Users className="h-4 w-4" />,
      color: '#3b82f6',
      requiresData: true,
      confirmMessage: 'Assign {count} selected incidents to a staff member?',
      successMessage: 'Successfully assigned {count} incidents'
    },
    {
      id: 'changePriority',
      label: 'Change Priority',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: '#f59e0b',
      requiresData: true,
      confirmMessage: 'Change priority for {count} selected incidents?',
      successMessage: 'Successfully updated priority for {count} incidents'
    },
    {
      id: 'changeStatus',
      label: 'Change Status',
      icon: <Clock className="h-4 w-4" />,
      color: '#10b981',
      requiresData: true,
      confirmMessage: 'Change status for {count} selected incidents?',
      successMessage: 'Successfully updated status for {count} incidents'
    },
    {
      id: 'escalate',
      label: 'Escalate',
      icon: <TrendingUp className="h-4 w-4" />,
      color: '#ef4444',
      requiresData: true,
      confirmMessage: 'Escalate {count} selected incidents for additional support?',
      successMessage: 'Successfully escalated {count} incidents'
    },
    {
      id: 'addNotes',
      label: 'Add Notes',
      icon: <FileText className="h-4 w-4" />,
      color: '#8b5cf6',
      requiresData: true,
      confirmMessage: 'Add notes to {count} selected incidents?',
      successMessage: 'Successfully added notes to {count} incidents'
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      color: '#06b6d4',
      requiresData: false,
      confirmMessage: 'Export {count} selected incidents to CSV?',
      successMessage: 'Successfully exported {count} incidents'
    }
  ];

  // Filter actions based on user role
  const availableActions = bulkActions.filter(action => {
    if (user?.role === 'station_staff') {
      return ['addNotes', 'export'].includes(action.id);
    }
    return true; // All actions available for admins
  });

  const handleActionClick = (action: BulkAction) => {
    setCurrentAction(action);
    setShowModal(true);
  };

  const handleConfirmAction = async (data?: any) => {
    if (!currentAction) return;

    try {
      setIsLoading(true);
      await onBulkAction(currentAction.id, data);
      
      toast({
        title: "Success",
        description: currentAction.successMessage.replace('{count}', selectedIncidents.length.toString()),
      });
      
      setShowModal(false);
      onClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${currentAction.label.toLowerCase()} incidents. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = selectedIncidents.length;
  const totalCount = allIncidents.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedCount} of {totalCount} selected
              </span>
              <Badge variant="secondary" className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                Bulk Actions
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {!allSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAll}
                  className="text-blue-600"
                >
                  Select All ({totalCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
                className="text-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-2"
                style={{ borderColor: action.color, color: action.color }}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Selected incidents preview */}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedIncidents.slice(0, 5).map((incident) => (
            <Badge
              key={incident.id}
              variant="outline"
              className="text-xs"
            >
              {incident.title.length > 30 
                ? `${incident.title.substring(0, 30)}...` 
                : incident.title
              }
            </Badge>
          ))}
          {selectedCount > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{selectedCount - 5} more
            </Badge>
          )}
        </div>
      </div>

      {currentAction && (
        <BulkActionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmAction}
          action={currentAction}
          selectedCount={selectedCount}
          isLoading={isLoading}
        />
      )}
    </>
  );
}; 