interface CheckoutStepperProps {
    currentStep: 1 | 2 | 3 | 4;
}

const STEPS = ['Shipping', 'Delivery', 'Payment', 'Review'];

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
    return (
        <div className="flex items-center w-full mb-8">
            {STEPS.map((label, index) => {
                const stepNum = index + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;

                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        {/* Step circle */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${isCompleted
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : isActive
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-400'
                                    }`}
                            >
                                {isCompleted ? '✓' : stepNum}
                            </div>
                            <span
                                className={`mt-1 text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                    }`}
                            >
                                {label}
                            </span>
                        </div>

                        {/* Connector line */}
                        {index < STEPS.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-2 mb-5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
