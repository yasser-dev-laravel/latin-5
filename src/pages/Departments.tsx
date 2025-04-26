
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { getFromLocalStorage, saveToLocalStorage, generateId, generateCode } from "@/utils/localStorage";
import { Department } from "@/utils/mockData";
import { FolderOpen, Plus, Search, Trash } from "lucide-react";

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Department>>({
    name: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage
  useEffect(() => {
    const storedDepartments = getFromLocalStorage<Department[]>("latin_academy_departments", []);
    setDepartments(storedDepartments);
  }, []);

  // Handle search
  const filteredDepartments = departments.filter(
    (department) => 
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      department.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم القسم",
        variant: "destructive",
      });
      return;
    }
    
    // Generate unique code
    const code = generateCode("DEP", departments);
    
    // Create new department
    const newDepartment: Department = {
      id: generateId("dept-"),
      code,
      name: formData.name,
    };
    
    // Add to state and localStorage
    const updatedDepartments = [...departments, newDepartment];
    setDepartments(updatedDepartments);
    saveToLocalStorage("latin_academy_departments", updatedDepartments);
    
    // Reset form and close dialog
    setFormData({
      name: "",
    });
    setIsDialogOpen(false);
    
    toast({
      title: "تم بنجاح",
      description: "تم إضافة القسم بنجاح",
    });
  };

  // Handle delete
  const handleDelete = (id: string) => {
    const updatedDepartments = departments.filter((department) => department.id !== id);
    setDepartments(updatedDepartments);
    saveToLocalStorage("latin_academy_departments", updatedDepartments);
    
    toast({
      title: "تم بنجاح",
      description: "تم حذف القسم بنجاح",
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight mb-4 md:mb-0">إدارة الأقسام</h2>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن قسم..."
              className="pr-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 ml-2" />
                إضافة قسم
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>إضافة قسم جديد</DialogTitle>
                <DialogDescription>
                  أدخل اسم القسم الجديد. سيتم إنشاء كود فريد تلقائياً.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم القسم *</Label>
                    <Input 
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="مثال: اللغة الإنجليزية"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit">حفظ</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأقسام</CardTitle>
          <CardDescription>
            إدارة أقسام الأكاديمية والتخصصات المختلفة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDepartments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>اسم القسم</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-primary" />
                          <span>{department.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(department.id)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              لم يتم العثور على أقسام. قم بإضافة أقسام جديدة.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Departments;
