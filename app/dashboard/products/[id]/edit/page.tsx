"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

// 🔹 Product Type
type Product = {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  standard_price: string;
  percentage_taxes: string;
  material_class: string;
  submaterial_class: string;
  tax_classification: string;
  material_origin: string;
  aplication: string;
  loan_product_code?: string;
  stock: number;
  image_url?: string;
};

export default function EditProduct() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product>({
    id: 0,
    code: "",
    name: "",
    manufacturer: "",
    standard_price: "0",
    percentage_taxes: "",
    material_class: "Chopp",
    submaterial_class: "",
    tax_classification: "",
    material_origin: "Nacional",
    aplication: "",
    loan_product_code: "",
    stock: 0,
    image_url: "",
  });

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error) {
        toast.error("Erro ao carregar produto!");
      } else {
        setProduct(data);
        if (data.image_url) setImagePreview(data.image_url);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: keyof Product, value: string) => {
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!product.name || !product.standard_price || !product.material_class) {
      toast.error("Preencha os campos obrigatórios!");
      setLoading(false);
      return;
    }

    let imageUrl = product.image_url ?? "";
    if (image) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { data, error } = await supabase.storage.from("products").upload(filePath, image);
      if (error) {
        toast.error("Erro ao fazer upload da imagem!");
      } else {
        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${filePath}`;
      }
    }

    const { error } = await supabase.from("products").update({
      code: product.code,
      name: product.name,
      manufacturer: product.manufacturer,
      standard_price: parseFloat(product.standard_price),
      percentage_taxes: product.percentage_taxes ? parseFloat(product.percentage_taxes) : null,
      material_class: product.material_class,
      submaterial_class: product.submaterial_class || null,
      tax_classification: product.tax_classification || null,
      material_origin: product.material_origin,
      aplication: product.aplication || null,
      loan_product_code: product.loan_product_code || null,
      image_url: imageUrl,
    }).eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar produto!");
    } else {
      toast.success("Produto atualizado com sucesso!");
      router.push("/dashboard/products");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Editar Produto</h1>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col items-center">
          <label htmlFor="imageUpload" className="cursor-pointer">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-40 object-cover rounded-lg shadow-md" />
            ) : (
              <div className="h-40 w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-500">Clique para adicionar uma imagem</span>
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
            <Select onValueChange={(value) => handleSelectChange("material_class", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Material Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chopp">Chopp</SelectItem>
                <SelectItem value="Equipamento">Equipamento</SelectItem>
                <SelectItem value="Acessório">Acessório</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" name="submaterial_class" value={product.submaterial_class} onChange={handleChange} placeholder="Submaterial Class" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="text" name="tax_classification" value={product.tax_classification} onChange={handleChange} placeholder="Tax Classification" />
            <Select onValueChange={(value) => handleSelectChange("material_origin", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Material Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nacional">Nacional</SelectItem>
                <SelectItem value="Importado">Importado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Textarea name="aplication" value={product.aplication} onChange={handleChange} placeholder="Product Application" />
          <Input type="text" name="loan_product_code" value={product.loan_product_code ?? ""} onChange={handleChange} placeholder="Loan Product Code" />

          <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}