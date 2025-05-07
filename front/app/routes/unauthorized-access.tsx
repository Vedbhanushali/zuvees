import { Card, CardBody, CardHeader } from "@heroui/react";

export default function UnAuth() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="max-w-[400px]">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-md">Unauthorized Access</p>
            </div>
          </CardHeader>
          <CardBody>
            <p>Please contact Administrator.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
