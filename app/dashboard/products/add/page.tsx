"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { useRouter } from "next/navigation";

export default function AddProduct() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const { companyId, loading } = useAuthenticatedCompany();
  const [product, setProduct] = useState({
    code: "",
    name: "",
    manufacturer: "",
    standard_price: "",
    percentage_taxes: "",
    material_class: "",
    submaterial_class: "",
    tax_classification: "",
    material_origin: "National",
    aplication: "",
    loan_product_code: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setProduct({ ...product, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const allowedTypes = ["image/png", "image/jpeg"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid format! Only PNG and JPG are allowed.");
        return;
      }

      setImage(file);

      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    const fileExt = image.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage.from("products").upload(filePath, image);

    if (error) {
      toast.error("Failed to upload image!");
      return null;
    }

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${filePath}`;
  };

  const handleSubmit = async () => {
    if (!product.name || !product.standard_price || !product.material_class || !product.code || !companyId) {
      toast.error("Fill in all required fields!");
      return;
    }

    setSubmitting(true);

    const { data: existingProduct, error: checkError } = await supabase
      .from("products")
      .select("code")
      .eq("code", product.code)
      .eq("company_id", companyId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      toast.error("Error checking product code!");
      setSubmitting(false);
      return;
    }

    if (existingProduct) {
      toast.error("Product code already exists!");
      setSubmitting(false);
      return;
    }

    const imageUrl = await uploadImage();

    const { error } = await supabase.from("products").insert([
      {
        ...product,
        standard_price: parseFloat(product.standard_price),
        percentage_taxes: product.percentage_taxes ? parseFloat(product.percentage_taxes) : null,
        image_url: imageUrl || null,
        company_id: companyId,
      },
    ]);

    if (error) {
      toast.error("Failed to create product!");
    } else {
      toast.success("Product successfully added!");
      router.push("/dashboard/products");
    }

    setSubmitting(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading company data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Add Product</h1>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col items-center">
          <label htmlFor="imageUpload" className="cursor-pointer">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-40 object-cover rounded-lg shadow-md" />
            ) : (
              <div className="h-40 w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-500">Click to upload image</span>
              </div>
            )}
          </label>
          <input type="file" id="imageUpload" accept="image/png, image/jpeg" className="hidden" onChange={handleImageChange} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="code" value={product.code} onChange={handleChange} placeholder="Product Code" required />
            <Input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Product Name" className="col-span-2" required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input type="text" name="standard_price" value={product.standard_price} onChange={handleChange} placeholder="Standard Price (R$)" required />
            <Input type="text" name="manufacturer" value={product.manufacturer} onChange={handleChange} placeholder="Manufacturer" />
            <Input type="text" name="percentage_taxes" value={product.percentage_taxes} onChange={handleChange} placeholder="Taxes (%)" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select value={product.material_class} onValueChange={(value) => handleSelectChange("material_class", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Material Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beer">Beer</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Accessory">Accessory</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" name="submaterial_class" value={product.submaterial_class} onChange={handleChange} placeholder="Sub Class" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="text" name="tax_classification" value={product.tax_classification} onChange={handleChange} placeholder="Tax Classification" />
            <Select value={product.material_origin} onValueChange={(value) => handleSelectChange("material_origin", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Material Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="National">National</SelectItem>
                <SelectItem value="Imported">Imported</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea name="aplication" value={product.aplication} onChange={handleChange} placeholder="Product Aplication" />

          <Input type="text" name="loan_product_code" value={product.loan_product_code} onChange={handleChange} placeholder="Loan Product Code (Optional)" />

          <Button className="w-full" onClick={handleSubmit} disabled={loading || submitting}>
            {submitting ? "Saving..." : "Save Product"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}