// components/Admin/StudentTable.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";

interface Props {
  refreshFlag?: boolean;
  onEdit: (student: any) => void;
}

export default function StudentTable({ refreshFlag, onEdit }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/students");
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [refreshFlag]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const res = await fetch(`/api/v1/admin/students/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchStudents();
    } catch (err) {
      console.error("Failed to delete student", err);
    }
  };

  if (loading) return <div>Loading students...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Enrolled At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.userId}>
            <TableCell>{student.name}</TableCell>
            <TableCell>{student.user.email}</TableCell>
            <TableCell>{student.department.name}</TableCell>
            <TableCell>
              {new Date(student.enrolledAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit(student)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(student.userId)}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
