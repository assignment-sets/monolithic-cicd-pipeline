// components/Admin/AdminDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import StudentTable from "./StudentTable";
import StudentForm from "./StudentForm";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

export default function AdminDashboard() {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [openForm, setOpenForm] = useState(false);

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setOpenForm(true);
  };

  const handleClose = () => {
    setSelectedStudent(null);
    setOpenForm(false);
  };

  const handleSuccess = () => {
    setRefreshFlag(!refreshFlag); // trigger table refresh
    handleClose();
  };

  return (
    <div className="p-8 min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <Button onClick={() => setOpenForm(true)}>Add Student</Button>
      </div>

      <StudentTable refreshFlag={refreshFlag} onEdit={handleEdit} />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? "Edit Student" : "Add Student"}
            </DialogTitle>
          </DialogHeader>
          <StudentForm
            initialData={selectedStudent}
            onSubmitSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
