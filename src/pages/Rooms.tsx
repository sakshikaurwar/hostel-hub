import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser, getRoomsSummary, getAllRooms, getRoomDetails, createRoom, getAvailableStudents, allocateStudent, removeStudentAllocation, type RoomSummary, type RoomWithStatus, type RoomDetail, type Student } from "@/lib/dataService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Home, Check, Plus, Trash2 } from "lucide-react";

export default function Rooms() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [summary, setSummary] = useState<RoomSummary>({ totalRooms: 0, availableRooms: 0, occupiedRooms: 0 });
  const [rooms, setRooms] = useState<RoomWithStatus[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ roomNo: "", capacity: "" });
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "warden") {
      navigate("/dashboard");
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryData = await getRoomsSummary();
      setSummary(summaryData);
      
      const roomsData = await getAllRooms();
      setRooms(roomsData);
    } catch (err) {
      setError("Failed to load rooms data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddRoom = async () => {
    if (!formData.roomNo || !formData.capacity) {
      setError("Please fill all fields");
      return;
    }

    setAllocating(true);
    setError(null);
    try {
      const success = await createRoom(parseInt(formData.roomNo), parseInt(formData.capacity), 1);
      if (success) {
        setFormData({ roomNo: "", capacity: "" });
        setShowAddRoomForm(false);
        await loadData();
      } else {
        setError("Failed to create room");
      }
    } catch (err) {
      setError("Error creating room");
      console.error(err);
    } finally {
      setAllocating(false);
    }
  };

  const handleRoomClick = async (roomId: number) => {
    try {
      const details = await getRoomDetails(roomId);
      if (details) {
        setSelectedRoom(details);
        setShowRoomModal(true);
        setError(null);
      }
    } catch (err) {
      setError("Failed to fetch room details");
      console.error(err);
    }
  };

  const handleOpenAllocateModal = async () => {
    setAllocating(true);
    try {
      const students = await getAvailableStudents();
      setAvailableStudents(students);
      setShowAllocateModal(true);
      setSelectedStudent(null);
    } catch (err) {
      setError("Failed to fetch available students");
      console.error(err);
    } finally {
      setAllocating(false);
    }
  };

  const handleAllocateStudent = async () => {
    if (!selectedStudent || !selectedRoom) {
      setError("Please select a student");
      return;
    }

    setAllocating(true);
    try {
      const success = await allocateStudent(selectedStudent, selectedRoom.room_id);
      if (success) {
        setShowAllocateModal(false);
        setSelectedStudent(null);
        await loadData();
        const updated = await getRoomDetails(selectedRoom.room_id);
        if (updated) setSelectedRoom(updated);
      } else {
        setError("Failed to allocate student");
      }
    } catch (err) {
      setError("Error allocating student");
      console.error(err);
    } finally {
      setAllocating(false);
    }
  };

  const handleRemoveStudent = async (allocationId: number) => {
    if (!window.confirm("Are you sure you want to remove this student?")) return;

    setRemoving(true);
    try {
      const success = await removeStudentAllocation(allocationId);
      if (success) {
        await loadData();
        if (selectedRoom) {
          const updated = await getRoomDetails(selectedRoom.room_id);
          if (updated) setSelectedRoom(updated);
        }
      } else {
        setError("Failed to remove student");
      }
    } catch (err) {
      setError("Error removing student");
      console.error(err);
    } finally {
      setRemoving(false);
    }
  };

  const getRoomColor = (room: RoomWithStatus) => {
    if (room.occupied === 0) return "bg-green-100 border-green-300 hover:bg-green-200";
    if (room.occupied < room.capacity) return "bg-yellow-100 border-yellow-300 hover:bg-yellow-200";
    return "bg-red-100 border-red-300 hover:bg-red-200";
  };

  const getRoomTextColor = (room: RoomWithStatus) => {
    if (room.occupied === 0) return "text-green-700";
    if (room.occupied < room.capacity) return "text-yellow-700";
    return "text-red-700";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Add Room Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rooms</h1>
            <p className="text-muted-foreground">View and manage hostel rooms</p>
          </div>
          <button
            onClick={() => setShowAddRoomForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add Room
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Home size={18} className="text-blue-500" />
                Total Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{summary.totalRooms}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Check size={18} className="text-green-500" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{summary.availableRooms}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users size={18} className="text-red-500" />
                Occupied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{summary.occupiedRooms}</p>
            </CardContent>
          </Card>
        </div>

        {/* Room Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Room Grid</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No rooms found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {rooms.map(room => (
                  <button
                    key={room.room_id}
                    onClick={() => handleRoomClick(room.room_id)}
                    className={`p-3 rounded border-2 transition-transform hover:scale-105 cursor-pointer ${getRoomColor(room)}`}
                  >
                    <div className={`text-center font-semibold text-sm ${getRoomTextColor(room)}`}>
                      {room.room_no}
                    </div>
                    <div className={`text-xs mt-1 ${getRoomTextColor(room)}`}>
                      {room.occupied}/{room.capacity}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                <span>Partial (occupied &lt; capacity)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
                <span>Full</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Room Form Modal */}
        <Dialog open={showAddRoomForm} onOpenChange={setShowAddRoomForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g., 101, 102"
                  value={formData.roomNo}
                  onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Capacity</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 2, 4"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddRoomForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRoom}
                  disabled={allocating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {allocating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Room Detail Modal */}
        <Dialog open={showRoomModal} onOpenChange={setShowRoomModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Room Details</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Room Number</p>
                    <p className="text-lg font-semibold">{selectedRoom.room_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-lg font-semibold capitalize`}>
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedRoom.status === "available" ? "bg-green-100 text-green-800" :
                        selectedRoom.status === "maintenance" ? "bg-gray-100 text-gray-800" :
                        selectedRoom.occupied < selectedRoom.capacity ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {selectedRoom.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="text-lg font-semibold">{selectedRoom.capacity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupied</p>
                    <p className="text-lg font-semibold">{selectedRoom.occupied}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Allocated Students</p>
                  {selectedRoom.students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students allocated</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedRoom.students.map(student => (
                        <div key={student.id} className="p-2 border rounded bg-muted/30 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(student.allocation_id)}
                            disabled={removing}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRoom.occupied < selectedRoom.capacity && (
                  <button
                    onClick={() => handleOpenAllocateModal()}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Allocate Student
                  </button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Allocate Student Modal */}
        <Dialog open={showAllocateModal} onOpenChange={setShowAllocateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Allocate Student</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Room {selectedRoom.room_no} ({selectedRoom.occupied}/{selectedRoom.capacity})
                </p>
                
                <div>
                  <label className="text-sm font-medium">Select Student</label>
                  <select
                    value={selectedStudent ?? ""}
                    onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a student...</option>
                    {availableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAllocateModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAllocateStudent}
                    disabled={allocating || !selectedStudent}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {allocating ? "Allocating..." : "Allocate"}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
