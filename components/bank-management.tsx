"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface BankAccount {
  id: string
  name: string
  branch: string
  account: string
}

export default function BankManagement() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [newAccount, setNewAccount] = useState({
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
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompany = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error("Error loading user info")
        return
      }
      const { data, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

      if (error || !data) {
        toast.error("Error loading company info")
        return
      }
      setCompanyId(data.company_id)
    }
    fetchCompany()
  }, [])

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase.from("bank_accounts").select("id, name, branch, account")
      if (error) {
        toast.error("Error loading bank accounts")
      } else {
        setBankAccounts(data || [])
      }
    }
    fetchAccounts()
  }, [])

  const handleAddAccount = async () => {

    console.log("DEBUG ⬇️");
    console.log("Bank Name:", newAccount.bankName);
    console.log("Branch:", newAccount.branch);
    console.log("Account Number:", newAccount.accountNumber);
    console.log("Company ID:", companyId);

    const isEmpty = (val: unknown) =>
      typeof val !== "string" || val.trim() === ""
    
    if (
      !newAccount.bankName ||
      !newAccount.branch ||
      !newAccount.accountNumber ||
      !companyId
    ) {
      toast.error("Please fill: Bank Name, Branch, and Account Number")
      return
    }
  
    const { error } = await supabase.from("bank_accounts").insert({
      name: newAccount.bankName,
      branch: newAccount.branch,
      account: newAccount.accountNumber,
      company_id: companyId,
      agency_name: newAccount.agencyName,
      remittance_program: newAccount.remittanceProgram,
      return_program: newAccount.returnProgram,
      company_code: newAccount.companyCode,
      launch_account: newAccount.launchAccount,
      boleto_issuer: newAccount.boletoIssuer,
      main_account: newAccount.mainAccount,
      emits_check: newAccount.emitsCheck,
      wallet: newAccount.wallet,
      interest: newAccount.interest,
      protest_days: newAccount.protestDays,
      late_fee: newAccount.lateFee,
      cedent_account: newAccount.cedentAccount,
      initial_number: newAccount.initialNumber,
      final_number: newAccount.finalNumber,
      message_1: newAccount.messageLine1,
      message_2: newAccount.messageLine2,
      message_3: newAccount.messageLine3,
      message_4: newAccount.messageLine4,
    })
  
    if (error) {
      toast.error("Error saving bank account")
    } else {
      toast.success("Bank account added successfully!")
      setModalOpen(false)
      setNewAccount({
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
      })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id)
    if (error) {
      toast.error("Error deleting bank account.")
    } else {
      toast.success("Bank account deleted.")
      setBankAccounts(prev => prev.filter(acc => acc.id !== id))
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-bold mb-4">Register Bank Account</h2>
      <div className="w-full flex justify-center gap-2 pb-4">
            <Input placeholder="Bank Code" value={newAccount.bankCode} onChange={(e) => setNewAccount({ ...newAccount, bankCode: e.target.value })} />
            <Input placeholder="Bank Name" value={newAccount.bankName} onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })} />
            <Input placeholder="Account Number" value={newAccount.accountNumber} onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })} />
      </div>
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="w-full h-auto">
            <TabsTrigger value="account">Cadastrate</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="grid grid-cols-2 gap-4 mt-4">
              <Input placeholder="Branch" value={newAccount.branch} onChange={(e) => setNewAccount({ ...newAccount, branch: e.target.value })} />
              <Input placeholder="Agency Name" value={newAccount.agencyName} onChange={(e) => setNewAccount({ ...newAccount, agencyName: e.target.value })} />
              <Input placeholder="Remittance Program" value={newAccount.remittanceProgram} onChange={(e) => setNewAccount({ ...newAccount, remittanceProgram: e.target.value })} />
              <Input placeholder="Return Program" value={newAccount.returnProgram} onChange={(e) => setNewAccount({ ...newAccount, returnProgram: e.target.value })} />
              <Input placeholder="Company Code" value={newAccount.companyCode} onChange={(e) => setNewAccount({ ...newAccount, companyCode: e.target.value })} />
              <Input placeholder="Launch Account" value={newAccount.launchAccount} onChange={(e) => setNewAccount({ ...newAccount, launchAccount: e.target.value })} />
              <Input placeholder="Boleto Issuer" value={newAccount.boletoIssuer} onChange={(e) => setNewAccount({ ...newAccount, boletoIssuer: e.target.value })} />
          </TabsContent>
          <TabsContent value="tickets" className="grid grid-cols-2 gap-4 mt-4">
          <Input placeholder="Wallet" value={newAccount.wallet} onChange={(e) => setNewAccount({ ...newAccount, wallet: e.target.value })} />
              <Input placeholder="Monthly Interest (%)" value={newAccount.interest} onChange={(e) => setNewAccount({ ...newAccount, interest: e.target.value })} />
              <Input placeholder="Protest Days" value={newAccount.protestDays} onChange={(e) => setNewAccount({ ...newAccount, protestDays: e.target.value })} />
              <Input placeholder="Late Fee (%)" value={newAccount.lateFee} onChange={(e) => setNewAccount({ ...newAccount, lateFee: e.target.value })} />
              <Input placeholder="Cedent Account" value={newAccount.cedentAccount} onChange={(e) => setNewAccount({ ...newAccount, cedentAccount: e.target.value })} />
              <Input placeholder="Initial Number" value={newAccount.initialNumber} onChange={(e) => setNewAccount({ ...newAccount, initialNumber: e.target.value })} />
              <Input placeholder="Final Number" value={newAccount.finalNumber} onChange={(e) => setNewAccount({ ...newAccount, finalNumber: e.target.value })} />
            
              <Input placeholder="Message Line 1" value={newAccount.messageLine1} onChange={(e) => setNewAccount({ ...newAccount, messageLine1: e.target.value })} />
              <Input placeholder="Message Line 2" value={newAccount.messageLine2} onChange={(e) => setNewAccount({ ...newAccount, messageLine2: e.target.value })} />
              <Input placeholder="Message Line 3" value={newAccount.messageLine3} onChange={(e) => setNewAccount({ ...newAccount, messageLine3: e.target.value })} />
              <Input placeholder="Message Line 4" value={newAccount.messageLine4} onChange={(e) => setNewAccount({ ...newAccount, messageLine4: e.target.value })} />
          </TabsContent>
        </Tabs>

        <div className="w-full flex justify-center mt-4">
          <Button onClick={handleAddAccount} className="w-full">Add Bank</Button>
        </div>

        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Bank Code</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {bankAccounts.length > 0 ? (
                bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.branch}</TableCell>
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
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No bank accounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
    </div>
  );
}