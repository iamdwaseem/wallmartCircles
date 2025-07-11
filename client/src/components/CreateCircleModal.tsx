import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign } from "lucide-react";

const createCircleSchema = z.object({
  name: z.string().min(1, "Circle name is required").max(50, "Circle name must be less than 50 characters"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  budget: z.number().min(0, "Budget must be 0 or greater").optional(),
});

type CreateCircleData = z.infer<typeof createCircleSchema>;

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCircleModal({ isOpen, onClose }: CreateCircleModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCircleData>({
    resolver: zodResolver(createCircleSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: 0,
    },
  });

  const createCircleMutation = useMutation({
    mutationFn: async (data: CreateCircleData) => {
      const response = await apiRequest("POST", "/api/circles", {
        ...data,
        budget: data.budget ? Math.round(data.budget * 100) : 0, // Convert to cents
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Circle created!",
        description: "Your new circle has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create circle",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateCircleData) => {
    createCircleMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[hsl(var(--walmart-blue))] rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span>Create New Circle</span>
          </DialogTitle>
          <DialogDescription>
            Create a new shopping circle to collaborate with friends and family.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circle Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Family Shopping, Office Supplies"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this circle is for..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="pl-10"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createCircleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCircleMutation.isPending}
              >
                {createCircleMutation.isPending ? "Creating..." : "Create Circle"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
