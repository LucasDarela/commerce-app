"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuthenticatedCompany } from "@/hooks/useAuthenticatedCompany";
import { TableSkeleton } from "./ui/TableSkeleton";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface BankAccount {
  id: string;
  name: string;
  branch: string;
  account: string;
  agency_name: string;
  bank_code: string;
}

interface NewAccountInput {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  agencyName: string;
  remittanceProgram: string;
  returnProgram: string;
  companyCode: string;
  launchAccount: string;
  boletoIssuer: string;
  mainAccount: boolean;
  emitsCheck: boolean;
  wallet: string;
  interest: string;
  protestDays: string;
  lateFee: string;
  cedentAccount: string;
  initialNumber: string;
  finalNumber: string;
  messageLine1: string;
  messageLine2: string;
  messageLine3: string;
  messageLine4: string;
}

const defaultNewAccount: NewAccountInput = {
  bankCode: "",
  bankName: "",
  accountNumber: "",
  branch: "",
  agencyName: "",
  remittanceProgram: "",
  returnProgram: "",
  companyCode: "",
  launchAccount: "",
  boletoIssuer: "",
  mainAccount: false,
  emitsCheck: false,
  wallet: "",
  interest: "",
  protestDays: "",
  lateFee: "",
  cedentAccount: "",
  initialNumber: "",
  finalNumber: "",
  messageLine1: "",
  messageLine2: "",
  messageLine3: "",
  messageLine4: "",
};

export default function BankManagement() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { companyId, loading } = useAuthenticatedCompany();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [newAccount, setNewAccount] =
    useState<NewAccountInput>(defaultNewAccount);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAccounts = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, name, branch, account, agency_name, bank_code")
      .eq("company_id", companyId)
      .order("name", { ascending: true })
      .returns<BankAccount[]>();

    if (error) {
      console.error(error);
      toast.error("Error loading bank accounts");
      return;
    }

    setBankAccounts(data || []);
  };

  useEffect(() => {
    fetchAccounts();
  }, [companyId]);

  const handleAddAccount = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (
      !newAccount.bankName.trim() ||
      !newAccount.branch.trim() ||
      !newAccount.accountNumber.trim()
    ) {
      toast.error("Porfavor Preencha: Nome do Banco, Agência e Conta");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: newAccount.bankName.trim(),
        branch: newAccount.branch.trim(),
        account: newAccount.accountNumber.trim(),
        bank_code: newAccount.bankCode.trim() || null,
        company_id: companyId,
        agency_name: newAccount.agencyName.trim() || null,
        remittance_program: newAccount.remittanceProgram.trim() || null,
        return_program: newAccount.returnProgram.trim() || null,
        company_code: newAccount.companyCode.trim() || null,
        launch_account: newAccount.launchAccount.trim() || null,
        boleto_issuer: newAccount.boletoIssuer.trim() || null,
        main_account: newAccount.mainAccount,
        emits_check: newAccount.emitsCheck,
        wallet: newAccount.wallet.trim() || null,
        interest: newAccount.interest.trim() || null,
        protest_days: newAccount.protestDays.trim() || null,
        late_fee: newAccount.lateFee.trim() || null,
        cedent_account: newAccount.cedentAccount.trim() || null,
        initial_number: newAccount.initialNumber.trim() || null,
        final_number: newAccount.finalNumber.trim() || null,
        message_1: newAccount.messageLine1.trim() || null,
        message_2: newAccount.messageLine2.trim() || null,
        message_3: newAccount.messageLine3.trim() || null,
        message_4: newAccount.messageLine4.trim() || null,
      };

      const { error } = await supabase.from("bank_accounts").insert(payload);

      if (error) {
        console.error(error);
        toast.error("Error saving bank account");
        return;
      }

      toast.success("Bank account added successfully!");
      setNewAccount(defaultNewAccount);
      await fetchAccounts();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }

    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      console.error(error);
      toast.error("Error deleting bank account.");
      return;
    }

    toast.success("Bank account deleted.");
    setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6 py-8">
      <h2 className="text-xl font-bold mb-4">Registre uma Conta Bancária</h2>

      <div className="w-full flex justify-center gap-2 pb-4">
        <Input
          placeholder="Código do Banco"
          value={newAccount.bankCode}
          onChange={(e) =>
            setNewAccount({ ...newAccount, bankCode: e.target.value })
          }
        />
        <Input
          placeholder="Nome do Banco"
          value={newAccount.bankName}
          onChange={(e) =>
            setNewAccount({ ...newAccount, bankName: e.target.value })
          }
        />
        <Input
          placeholder="Conta"
          value={newAccount.accountNumber}
          onChange={(e) =>
            setNewAccount({ ...newAccount, accountNumber: e.target.value })
          }
        />
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full h-auto">
          <TabsTrigger value="account">Cadastrar</TabsTrigger>
          <TabsTrigger value="tickets" disabled>
            Boletos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="grid grid-cols-2 gap-4 mt-4">
          <Input
            placeholder="Agência"
            value={newAccount.branch}
            onChange={(e) =>
              setNewAccount({ ...newAccount, branch: e.target.value })
            }
          />
          <Input
            placeholder="Nome da Agência"
            value={newAccount.agencyName}
            onChange={(e) =>
              setNewAccount({ ...newAccount, agencyName: e.target.value })
            }
          />
          <Input
            placeholder="Programa de Remessa"
            value={newAccount.remittanceProgram}
            onChange={(e) =>
              setNewAccount({
                ...newAccount,
                remittanceProgram: e.target.value,
              })
            }
          />
          <Input
            placeholder="Programa de Retorno"
            value={newAccount.returnProgram}
            onChange={(e) =>
              setNewAccount({ ...newAccount, returnProgram: e.target.value })
            }
          />
          <Input
            placeholder="Código da Empresa"
            value={newAccount.companyCode}
            onChange={(e) =>
              setNewAccount({ ...newAccount, companyCode: e.target.value })
            }
          />
          <Input
            placeholder="Conta de Lançamento"
            value={newAccount.launchAccount}
            onChange={(e) =>
              setNewAccount({ ...newAccount, launchAccount: e.target.value })
            }
          />
          <Input
            placeholder="Cedente do Boleto"
            value={newAccount.boletoIssuer}
            onChange={(e) =>
              setNewAccount({ ...newAccount, boletoIssuer: e.target.value })
            }
          />
        </TabsContent>

        <TabsContent value="tickets" className="grid grid-cols-2 gap-4 mt-4">
          <Input
            placeholder="Wallet"
            value={newAccount.wallet}
            onChange={(e) =>
              setNewAccount({ ...newAccount, wallet: e.target.value })
            }
          />
          <Input
            placeholder="Monthly Interest (%)"
            value={newAccount.interest}
            onChange={(e) =>
              setNewAccount({ ...newAccount, interest: e.target.value })
            }
          />
          <Input
            placeholder="Protest Days"
            value={newAccount.protestDays}
            onChange={(e) =>
              setNewAccount({ ...newAccount, protestDays: e.target.value })
            }
          />
          <Input
            placeholder="Late Fee (%)"
            value={newAccount.lateFee}
            onChange={(e) =>
              setNewAccount({ ...newAccount, lateFee: e.target.value })
            }
          />
          <Input
            placeholder="Cedent Account"
            value={newAccount.cedentAccount}
            onChange={(e) =>
              setNewAccount({ ...newAccount, cedentAccount: e.target.value })
            }
          />
          <Input
            placeholder="Initial Number"
            value={newAccount.initialNumber}
            onChange={(e) =>
              setNewAccount({ ...newAccount, initialNumber: e.target.value })
            }
          />
          <Input
            placeholder="Final Number"
            value={newAccount.finalNumber}
            onChange={(e) =>
              setNewAccount({ ...newAccount, finalNumber: e.target.value })
            }
          />
          <Input
            placeholder="Message Line 1"
            value={newAccount.messageLine1}
            onChange={(e) =>
              setNewAccount({ ...newAccount, messageLine1: e.target.value })
            }
          />
          <Input
            placeholder="Message Line 2"
            value={newAccount.messageLine2}
            onChange={(e) =>
              setNewAccount({ ...newAccount, messageLine2: e.target.value })
            }
          />
          <Input
            placeholder="Message Line 3"
            value={newAccount.messageLine3}
            onChange={(e) =>
              setNewAccount({ ...newAccount, messageLine3: e.target.value })
            }
          />
          <Input
            placeholder="Message Line 4"
            value={newAccount.messageLine4}
            onChange={(e) =>
              setNewAccount({ ...newAccount, messageLine4: e.target.value })
            }
          />
        </TabsContent>
      </Tabs>

      <div className="w-full flex justify-center mt-4">
        <Button
          onClick={handleAddAccount}
          disabled={
            isSaving ||
            !newAccount.bankName.trim() ||
            !newAccount.branch.trim() ||
            !newAccount.accountNumber.trim()
          }
          className="w-full"
        >
          {isSaving ? "Salvando..." : "Adicionar Conta"}
        </Button>
      </div>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Código do Banco</TableHead>
            <TableHead>Nome do Banco</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {bankAccounts.length > 0 ? (
            bankAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.bank_code}
                </TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.account}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-sm text-muted-foreground"
              >
                Nenhuma conta bancária encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
