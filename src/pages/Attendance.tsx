import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { getFromLocalStorage, saveToLocalStorage, generateId, generateCode } from "@/utils/localStorage";
import { Branch, Lab, Group, CourseLevel, Student } from "@/utils/mockData";
import { toast } from "react-hot-toast";

const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

function getDayGroups(groups: Group[], date: string, labs: Lab[]) {
  // لكل قاعة، لكل فترة زمنية، ابحث عن المجموعة التي لديها محاضرة
  // (هنا نعتمد أن كل مجموعة لديها startTime ومدة وعدد مرات أسبوعية)
  const result: Record<string, Record<string, Group | null>> = {};
  labs.forEach(lab => {
    result[lab.id] = {};
    TIME_SLOTS.forEach(slot => {
      // ابحث عن مجموعة تبدأ في هذا الوقت في هذه القاعة في هذا اليوم
      result[lab.id][slot] = groups.find(g => g.labId === lab.id && g.startTime === slot && g.weeklyDays.includes(getArabicDayName(new Date(date).getDay())) && g.startDate <= date && g.endDate >= date) || null;
    });
  });
  return result;
}

// تصدير دالة اليوم بالعربية لاستخدامها خارجيًا
export function getArabicDayName(day: number) {
  return ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][day];
}

export default function Attendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [attendanceDialog, setAttendanceDialog] = useState<{ open: boolean; group: Group | null; slot: string }>({ open: false, group: null, slot: "" });
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [sessionImage, setSessionImage] = useState<string>("");
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [isLastSession, setIsLastSession] = useState(false);
  const [levels, setLevels] = useState<CourseLevel[]>([]);

  useEffect(() => {
    setBranches(getFromLocalStorage<Branch[]>("latin_academy_branches", []));
    setLabs(getFromLocalStorage<Lab[]>("latin_academy_labs", []));
    setGroups(getFromLocalStorage<Group[]>("latin_academy_groups", []));
    setStudents(getFromLocalStorage<Student[]>("latin_academy_students", []));
    setLevels(getFromLocalStorage<CourseLevel[]>("latin_academy_levels", []));
    // تطبيق الفرع الافتراضي إذا لم يحدد المستخدم فرع
    const def = localStorage.getItem("latin_academy_default_branch");
    setSelectedBranch(b => b || def || "");
  }, []);

  useEffect(() => {
    if (attendanceDialog.open && attendanceDialog.group) {
      const groupStudents = students.filter(s => attendanceDialog.group!.studentIds.includes(s.id));
      const att: Record<string, boolean> = {};
      groupStudents.forEach(s => { att[s.id] = true; }); // افتراضيًا الكل حاضر
      setAttendance(att);
      setSessionImage("");
      // حساب رقم المحاضرة
      const group = attendanceDialog.group;
      const sessionNum = getSessionNumber(group.id);
      setSessionNumber(sessionNum);
      setIsLastSession(false);
      setShowEndOptions(shouldShowEndOptions(group));
    }
  }, [attendanceDialog.open, attendanceDialog.group, students, levels]);

  const handleToggleAll = (present: boolean) => {
    if (!attendanceDialog.group) return;
    const groupStudents = students.filter(s => attendanceDialog.group!.studentIds.includes(s.id));
    const att: Record<string, boolean> = {};
    groupStudents.forEach(s => { att[s.id] = present; });
    setAttendance(att);
  };

  const handleSendWhatsApp = (phones: string[], group: Group) => {
    if (phones.length === 0) return;
    // توليد رابط واتساب جماعي
    const msg = encodeURIComponent(`أنت غائب اليوم عن محاضرة المجموعة: ${group.name} (${group.code}) في الأكاديمية. إذا كان لديك عذر تواصل مع الإدارة.`);
    phones.forEach(phone => {
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    });
    toast.success("تم فتح رسائل واتساب للغائبين!");
  };

  const handleSaveAttendance = () => {
    const group = attendanceDialog.group!;
    const absents = Object.entries(attendance).filter(([id, v]) => !v).map(([id]) => students.find(s => s.id === id)?.phone).filter(Boolean) as string[];
    // حفظ السيشن
    const sessions = getFromLocalStorage<any[]>(`latin_academy_sessions_${group.id}`, []);
    saveToLocalStorage(`latin_academy_sessions_${group.id}`, [...sessions, {
      date,
      sessionNumber,
      attendance,
      image: sessionImage
    }]);
    handleSendWhatsApp(absents, group);
    // إذا كانت آخر محاضرة، أظهر خيارات إنهاء/استمرار/ترقية
    if (isLastSession) {
      setShowEndOptions(true);
    } else {
      setAttendanceDialog({ open: false, group: null, slot: "" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setSessionImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // إنهاء المجموعة
  const handleFinishGroup = () => {
    if (!attendanceDialog.group) return;
    const updatedGroups = groups.map(g => g.id === attendanceDialog.group!.id ? { ...g, status: "finished" } : g);
    saveToLocalStorage("latin_academy_groups", updatedGroups);
    toast.success("تم إنهاء المجموعة!");
    setAttendanceDialog({ open: false, group: null, slot: "" });
  };

  // ترقية المجموعة لمستوى جديد
  const handleUpgradeGroup = () => {
    if (!attendanceDialog.group) return;
    // ابحث عن المستوى التالي
    const group = attendanceDialog.group;
    const groupLevel = levels.find(l => l.id === group.levelId);
    const courseLevels = levels.filter(l => l.courseId === group.courseId).sort((a, b) => a.levelNumber - b.levelNumber);
    const nextLevel = courseLevels.find(l => l.levelNumber === (groupLevel?.levelNumber || 0) + 1);
    if (!nextLevel) {
      toast.error("لا يوجد مستوى تالي لهذا الكورس!");
      return;
    }
    // أنشئ مجموعة جديدة بنفس الطلاب مع المستوى الجديد
    const newGroup = {
      ...group,
      id: generateId("grp-"),
      code: generateCode("GRP", groups),
      levelId: nextLevel.id,
      name: group.name.replace(groupLevel?.levelNumber?.toString() || "", nextLevel.levelNumber.toString()),
      status: "active",
      startDate: date,
      endDate: "",
    };
    saveToLocalStorage("latin_academy_groups", [...groups, newGroup]);
    toast.success("تم ترقية المجموعة لمستوى جديد!");
    setAttendanceDialog({ open: false, group: null, slot: "" });
  };

  // هل تم تسجيل حضور هذه المجموعة في هذا اليوم وهذا الوقت؟
  function isSessionTaken(groupId: string, date: string, slot: string) {
    const sessions = getFromLocalStorage<any[]>(`latin_academy_sessions_${groupId}`, []);
    return sessions.some(s => s.date === date && s.slot === slot);
  }

  // هل وقت المجموعة الآن؟
  function getSessionStatus(slot: string, date: string) {
    const now = new Date();
    const [hour, min] = slot.split(":").map(Number);
    const slotDate = new Date(date + "T" + slot);
    const slotEnd = new Date(slotDate.getTime() + 60 * 60 * 1000); // ساعة افتراضيًا
    if (now >= slotDate && now < slotEnd) return "now";
    if (now > slotEnd) return "past";
    return "future";
  }

  // تحديد رقم المحاضرة الفعلي
  function getSessionNumber(groupId: string) {
    const sessions = getFromLocalStorage<any[]>(`latin_academy_sessions_${groupId}`, []);
    return sessions.length + 1;
  }

  // التحقق من نهاية المستوى
  function shouldShowEndOptions(group: Group) {
    const groupLevel = levels.find(l => l.id === group.levelId);
    const sessionNum = getSessionNumber(group.id);
    return groupLevel && sessionNum >= groupLevel.lectureCount;
  }

  const filteredLabs = selectedBranch ? labs.filter(l => l.branchId === selectedBranch) : [];
  const dayGroups = getDayGroups(groups, date, filteredLabs);

  const handleOpenAttendanceDialog = (group: Group, slot: string) => {
    setAttendanceDialog({ open: true, group, slot });
    // تحقق هل يجب إظهار خيارات إنهاء/ترقية المجموعة
    setShowEndOptions(group ? shouldShowEndOptions(group) : false);
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>جدول الغيابات اليومي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="border rounded px-2">
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {filteredLabs.length > 0 ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفترة \ القاعة</TableHead>
                    {filteredLabs.map(lab => <TableHead key={lab.id}>{lab.name}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIME_SLOTS.map(slot => (
                    <TableRow key={slot}>
                      <TableCell>{slot}</TableCell>
                      {filteredLabs.map(lab => {
                        const group = dayGroups[lab.id][slot];
                        const taken = group && isSessionTaken(group.id, date, slot);
                        let btnColor = "";
                        let disabled = false;
                        if (group) {
                          if (taken) {
                            btnColor = "bg-green-500 text-white hover:bg-green-600";
                            disabled = true;
                          } else {
                            const status = getSessionStatus(slot, date);
                            if (status === "now") btnColor = "bg-blue-500 text-white hover:bg-blue-600";
                            else if (status === "past") btnColor = "bg-red-500 text-white hover:bg-red-600";
                          }
                        }
                        return (
                          <TableCell key={lab.id}>
                            {group ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className={btnColor}
                                disabled={disabled}
                                onClick={() => handleOpenAttendanceDialog(group, slot)}
                              >
                                {group.name} - {group.code} - {group.instructorId}
                              </Button>
                            ) : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <div>اختر الفرع لعرض القاعات</div>}
        </CardContent>
      </Card>
      <Dialog open={attendanceDialog.open} onOpenChange={open => setAttendanceDialog(v => ({ ...v, open }))}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تسجيل حضور/غياب المجموعة</DialogTitle>
          </DialogHeader>
          {attendanceDialog.group && (
            <div>
              <div>المجموعة: {attendanceDialog.group.name} - {attendanceDialog.group.code}</div>
              <div>المحاضر: {attendanceDialog.group.instructorId}</div>
              <div>رقم المحاضرة: {sessionNumber}</div>
              <div className="mt-4 mb-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleAll(true)}>حضور الكل</Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleAll(false)}>غياب الكل</Button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 mb-2">
                {students.filter(s => attendanceDialog.group!.studentIds.includes(s.id)).map(s => (
                  <label key={s.id} className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={attendance[s.id] || false} onChange={e => setAttendance(a => ({ ...a, [s.id]: e.target.checked }))} />
                    {s.name} ({s.phone})
                  </label>
                ))}
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  <span>إرفاق صورة للقاعة</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {sessionImage && <img src={sessionImage} alt="صورة القاعة" className="mt-2 max-h-32 rounded" />}
              </div>
              <Button onClick={handleSaveAttendance} className="mt-2 w-full">حفظ الحضور</Button>
              {showEndOptions && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="font-bold text-center">هذه هي المحاضرة الأخيرة للمجموعة!</div>
                  <Button variant="destructive" onClick={handleFinishGroup}>إنهاء المجموعة</Button>
                  <Button variant="default" onClick={handleUpgradeGroup}>ترقية للمستوى التالي</Button>
                  <Button variant="outline" onClick={() => setAttendanceDialog({ open: false, group: null, slot: "" })}>استمرار المجموعة</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
