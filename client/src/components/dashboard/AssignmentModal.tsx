import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getUsers } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Incident, User } from "@/types";

interface AssignmentModalProps {
  incident: Incident;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const AssignmentModal = ({ incident, onClose, onSubmit }: AssignmentModalProps) => {
  const { user } = useAuth();
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: staff } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "station_staff", stationId: user?.stationId }],
    queryFn: () => getUsers({ role: "station_staff", stationId: user?.stationId }),
    enabled: user?.role === "station_admin",
  });

  const handleSubmit = () => {
    if (!assignedTo || !priority) return;

    onSubmit({
      assignedTo: assignedTo, // UUID string - aligned with backend field name
      priority,
      notes,
    });
  };

  const resetForm = () => {
    setAssignedTo("");
    setPriority("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Incident</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Incident</Label>
            <p className="text-sm text-gray-600 mt-1">{incident.title}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Select Staff Member</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {staff?.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Priority Level</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Assignment Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!assignedTo || !priority}
            className="bg-red-600 hover:bg-red-700"
          >
            Assign Incident
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
